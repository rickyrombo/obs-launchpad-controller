/**
 * Taken from https://github.com/cynex/Launchpad 
 **/
function LaunchPad (parameters) {

	this.autodetect =  true;
	this.version = 0;
	this.ready = false;
	this.connected = false;
	this.frame=[];
	this.backframe = [];
	this.debug = false;

	this.midiAccess = null;
	this.midiOut = null;
	this.midiIn = null;
	this.midiOutConnected = false;
	this.midiInConnected = false;
	this.midiInputs = [];
	this.midiOutputs = [];

	this.renderMode = "rapid";
	this.useFrameBuffering = false;
	this.bufferIndex = 0;
	this.delayTimer = 3;
	this.timeout = null;	
	this.frameCount = 0;
	this.autoSwitch = false;
	this.model = "Not Detected";
	this.LPMK1Colors = ['000000','500000','A00000','FF0000','005000','505000','A05000','FF5000','00A000','50A000','A0A000','FFA000','00FF00','50FF00','A0FF00','FFFF00'];
	this.LPMK2Colors = ['000000','1c1c1c','7c7c7c','fcfcfc','ff4e48','fe0a00','5a0000','180002','ffbc63','ff5700','5a1d00','241802','fdfd21','fdfd00','585800','181800','81fd2b','40fd01','165800','132801','35fd2b','00fe00','005801','001800','35fc47','00fe00','005801','001800','32fd7f','00fd3a','015814','001c0e','2ffcb1','00fb91','015732','011810','39beff','00a7ff','014051','001018','4186ff','0050ff','011a5a','010619','4747ff','0000fe','00005a','000018','8347ff','5000ff','160067','0a0032','ff48fe','ff00fe','5a005a','180018','fb4e83','ff0753','5a021b','210110','ff1901','9a3500','7a5101','3e6500','013800','005432','00537f','0000fe','01444d','1a00d1','7c7c7c','202020','ff0a00','bafd00','acec00','56fd00','008800','01fc7b','00a7ff','021aff','3500ff','7800ff','b4177e','412000','ff4a01','82e100','66fd00','00fe00','00fe00','45fd61','01fbcb','5086ff','274dc8','847aed','d30cff','ff065a','ff7d01','b8b100','8afd00','815d00','3a2802','0d4c05','005037','131429','101f5a','6a3c18','ac0401','e15136','dc6900','fee100','99e101','60b500','1b1c31','dcfd54','76fbb9','9698ff','8b62ff','404040','747474','defcfc','a20401','340100','00d201','004101','b8b100','3c3000','b45d00','4c1300'];
	this.palette=[];
	this.modelType = "not initialized";

	var dateObject = new Date();
	this.timers = [];
	this.timers.firstTime =  dateObject.getTime();
	this.timers.deltaTime = dateObject.getTime();
	this.timers.thisTime =   dateObject.getTime();
	this.framesPerSecond = 0;
	this.currentDelta = 1;
	this.onFrameRender = null;
	this.onMidiNoteIn = null;	
	this.onConnect = null;	

	thisObject = this;

		if (parameters)
		{
			if (parameters.autodetect) { this.autodetect = parameters.autodetect; }
			if (parameters.autoSwitch) { this.autoSwitch = parameters.autoSwitch; }
			if (parameters.debug) { this.debug = parameters.debug; }
			if (parameters.renderMode) { this.renderMode=parameters.renderMode; }
			if (parameters.onMidiNoteIn) { this.onMidiNoteIn = parameters.onMidiNoteIn; }
			if (parameters.onFrameRender) { this.onFrameRender = parameters.onFrameRender; }
			if (parameters.onConnect) { this.onConnect = parameters.onConnect; }
		}

	this.copyCanvas = function (canvasID)
	{
		var canvas = document.getElementById(canvasID);
		var ctx = canvas.getContext('2d');
		var canvasWidth = canvas.width;
		var canvasHeight = canvas.height;
		var cvWidthMult = canvasWidth/8;
		var cvHeightMult = canvasHeight/8;
		var imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
		var data = imageData.data;
		for (x=0;x<8;x++)
		{
			for (y=0;y<8;y++)
				{
					var index = ((y*canvasWidth*4) * cvHeightMult) + ((x) * cvWidthMult * 4);
					r = data[index];
					g = data[++index];
					b = data[++index];
					a = data[++index];
					c = thisObject.mapColorToPalette(r,g,b);
					thisObject.setPixel (x,y,c);
				}
		}
	}

	this.createPalette = function(arr,model)
	{
		thisObject.modelType=model;
		thisObject.palette.length =0;
		for (i=0;i<arr.length;i++)
			{
				thisObject.palette[i]=thisObject.hexToRgb(arr[i]);
			}
	}

	this.hexToRgb = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
	}

	this.mapColorToPalette = function(red,green,blue){
        var color,diffR,diffG,diffB,diffDistance,mappedColor;
        var distance=250000;   
        var vel=0;
        if (this.modelType == "mk1") { return thisObject.rgColor (red>>5,green>>5); }
        for(var i=0;i<thisObject.palette.length;i++){
            color=thisObject.palette[i];            
            diffR=( color['r'] - red );
            diffG=( color['g'] - green );
            diffB=( color['b'] - blue );
            diffDistance = diffR*diffR + diffG*diffG + diffB*diffB;          
            if( diffDistance < distance  ){ 
                distance=diffDistance; 
                mappedColor=thisObject.palette[i]; 
                vel=i;
            }
        }
        // console.log (mappedColor);
        return(vel);
    }

	this.rgColor = function (red,green)
		{
			r = parseInt(red,10);
			g = parseInt(green,10);
			if (r > 3) r = 3;
			if (g > 3) g = 3;
			if (r <= 0) r = 0;
			if (g <= 0) g = 0;
			return (g << 4) + r;
		}
	
	this.getPixel = function (x,y)
		{
			return thisObject.frame[(y<<3)+x];
		}

	this.setPixel = function (x,y,c)
		{
			thisObject.frame[(y<<3)+x]=c;
			return true;
		}

	this.init = function () {
		thisObject.createPalette(thisObject.LPMK1Colors,"mk1");
		for (i=0;i<64;i++) { thisObject.frame[i]=0; thisObject.backframe[i]=0; }
		window.addEventListener('load', function() {   
  		if (navigator.requestMIDIAccess)
    		navigator.requestMIDIAccess().then( thisObject.onMIDIStarted, thisObject.onMIDISystemError );
		});
	}


	this.onMIDIStarted = function( midi ) {
	  var preferredIndex = 0;
	  thisObject.midiAccess = midi;
	  thisObject.connected = true;
	  midi.onstatechange = thisObject.midiConnectionStateChange;	 
  	  thisObject.detectDevices();
	}

	this.onMIDISystemError = function( err ) {
	  	console.log( "MIDI not initialized - error encountered:" + err.code );
	}

	this.midiConnectionStateChange = function( e ) {
  		if (thisObject.debug) console.log("connection: " + e.port.name + " " + e.port.connection + " " + e.port.state + " " + e.port.id);
	}

	this.checkIsReadyState = function () {
			if (thisObject.midiInConnected && thisObject.midiOutConnected)
				{
					thisObject.ready = true;
					return true;
				}
			else { 
					thisObject.ready=false;
					return false;
				}
	}

	this.detectDevices = function ()
	{
		var count = 0;

		var midiInputs = [];
		var midiOutputs = [];
		
		if (thisObject.midiOut && thisObject.midiOut.state=="disconnected")
    	thisObject.midiOut=null;
   		if (thisObject.midiIn && thisObject.midiIn.state=="disconnected")
    	thisObject.midiIn=null;
  		
  		outputs=thisObject.midiAccess.outputs.values();
  	    inputs=thisObject.midiAccess.inputs.values();
  	    count = 0;
	  	    for ( var output = outputs.next(); output && !output.done; output = outputs.next()){
	    	output = output.value;
	    	midiOutputs[count]=[];
	    	midiOutputs[count]['name'] = output.name;
	    	midiOutputs[count]['id'] = output.id;
	    	if (thisObject.autodetect)
    	  			{
    	  				if (output.name.indexOf ("Launchpad") >= 0) thisObject.selectMidiOut (output.id);
    	  				if (output.name.indexOf ("Novation") >= 0) thisObject.selectMidiOut (output.id);
    	  			}
	    	}

  	    count = 0;
	  	    for ( var input = inputs.next(); input && !input.done; input = inputs.next()){
	    	input = input.value;
	    	midiInputs[count]=[];
	    	midiInputs[count]['name'] = input.name;
	    	midiInputs[count]['id'] = input.id;	    	
	    			if (thisObject.autodetect)
    	  			{
    	  				if (input.name.indexOf ("Launchpad") >= 0) thisObject.selectMidiIn (input.id);    
    	  				if (input.name.indexOf ("Novation") >= 0) thisObject.selectMidiIn (input.id);    		  				
    	  			}
	    	}

    	thisObject.midiInputs = midiInputs;
		thisObject.midiOutputs = midiOutputs;    	
    	if (thisObject.checkIsReadyState() == true)
    			{
    				thisObject.connect();
    				if (thisObject.onConnect) { thisObject.onConnect(); }
    			}

	}

	this.clearScreen = function (val)
	{
			for (y=0;y<8;y++)
				{
				for (x=0;x<8;x++) {
					thisObject.frame[y*8+x]=val;
				}
			}
	}

	this.getFrameTimeoutSpeed = function ()
	{
		delayTimer=3;
		if (thisObject.renderMode=="rapid") { delayTimer=1.5; }
		thisObject.delayTimer = 64 * delayTimer;
	}

	this.connect = function ()
	{
		thisObject.getFrameTimeoutSpeed ();
		thisObject.timeout = setTimeout (thisObject.renderFrame,thisObject.delayTimer);
	}

	this.disconnect = function () {
		clearTimeout (thisObject.timeout);
	}

	this.renderFrame = function ()
	{
		thisObject.getFrameTimeoutSpeed ();

		if (thisObject.onFrameRender) { thisObject.onFrameRender( thisObject.currentDelta ); }
			if (thisObject.useFrameBuffering == true) {
				 if (thisObject.bufferIndex == 0) {
				 	// Send Buffer Frame
				 	thisObject.midiOut.send ([ 176, 0, 49] );
				 } else {
				 	// Send to Back Buffer Frame
				 	thisObject.midiOut.send ([ 176, 0, 52] );
				 }
				 thisObject.bufferIndex = 1-thisObject.bufferIndex;
				}
			else {
				// Set Mode to Standard
				thisObject.midiOut.send ([ 176, 0, 48] );
			}
		padsChanged=0;
		thisTimeRenderMode = thisObject.renderMode;
		if (thisObject.autoSwitch) {
			counter=0;
			for (i=0;i<64;i++) { if (thisObject.frame[i] != thisObject.backframe[i]) counter++; }
			if(counter>32) { thisTimeRenderMode="rapid";}
			else { thisTimeRenderMode="standard";}
		}
		//console.log (thisTimeRenderMode);
		if (thisTimeRenderMode=="standard") {
			for (y=0;y<8;y++)
				{
				for (x=0;x<8;x++) {
					if (thisObject.frame[y*8+x] != thisObject.backframe[y*8+x])
					{
					thisObject.midiOut.send ( [144,(y<<4)+x,thisObject.frame[(y<<3)+x]]);
					thisObject.backframe[(y<<3)+x]=thisObject.frame[(y<<3)+x];
					padsChanged++;
					}
				}
			}
	    }
	    if (thisTimeRenderMode == "rapid") {

	    	for (y=0;y<8;y++)
				{
				for (x=0;x<8;x+=2) {
					thisObject.midiOut.send ( [146,thisObject.frame[(y<<3)+x],thisObject.frame[(y<<3)+(x+1)]]);
					thisObject.backframe[(y<<3)+x]=thisObject.frame[(y<<3)+x];
					thisObject.backframe[(y<<3)+x+1]=thisObject.frame[(y<<3)+x+1];
				}
			}
	 		thisObject.midiOut.send ( [144,9,0]);

	    }

	    // CALCULATE Delta Time and FPS
		var dateObject = new Date();
	    thisObject.timers.thisTime = dateObject.getTime();
	    thisObject.frameCount++;
	    timeDifference = (thisObject.timers.thisTime - thisObject.timers.firstTime);
	    timeDifferenceDelta = (thisObject.timers.thisTime - thisObject.timers.deltaTime);
	    thisObject.timers.deltaTime=thisObject.timers.thisTime;
	    thisObject.currentDelta = timeDifferenceDelta;
	    fps = timeDifference / thisObject.frameCount * 60 / 1000;
	    thisObject.framesPerSecond=fps;


		nextDelay = thisObject.delayTimer;
		if (thisObject.renderMode == "standard")
		{
			nextDelay=padsChanged * 3;
		}
		if (nextDelay < 20) nextDelay=20; // never set a 0 timeout;	
		thisObject.timeout = setTimeout (thisObject.renderFrame,nextDelay);
	}

	this.midiMessageReceived = function( ev ) {
		if (thisObject.debug) {  console.log( "" + ev.data[0] + " " + ev.data[1] + " " + ev.data[2]); }
		if (thisObject.onMidiNoteIn) thisObject.onMidiNoteIn (ev);

	}

	this.selectMidiIn = function (id)
	{
		  thisObject.midiInConnected=false;
		  if (thisObject.midiIn)
    	  thisObject.midiIn.onmidimessage = null;
		  if ((typeof(thisObject.midiAccess.inputs) == "function"))  {
		    thisObject.midiIn = thisObject.midiAccess.inputs()[id];
		  } //Old Skool MIDI inputs() code    
		  else {
		        thisObject.midiIn = thisObject.midiAccess.inputs.get(id);
		  }
		  if (thisObject.midiIn)
		  {
		    thisObject.midiIn.onmidimessage = thisObject.midiMessageReceived;
		    thisObject.midiInConnected = true;
		  }
		  	thisObject.checkIsReadyState();
	}

	this.selectMidiOut = function (id)
	{
		  thisObject.midiOutConnected=false;
		  if ((typeof(thisObject.midiAccess.outputs) == "function"))  {
		    thisObject.midiOut = thisObject.midiAccess.outputs()[id];
		  } //Old Skool MIDI inputs() code    
		  else {
		        thisObject.midiOut = thisObject.midiAccess.outputs.get(id);
		  }		
		  if (thisObject.midiOut)
		  {
		   	   thisObject.midiOutConnected = true;
		  }
		  thisObject.checkIsReadyState();
	}

	this.init ();
	return;
}