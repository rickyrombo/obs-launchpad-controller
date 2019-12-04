

export const PlaySound = {
  name: 'Media',
  actions: [{
    name: 'Play Local Sound',
    doAction: (state, action) => {
      const nowPlaying = state.nowPlaying;
      const options = action.payload.options;
      if (nowPlaying) {
        if (options.playAction == 'Play / Stop' 
            || options.playAction == 'Loop / Stop') {
          nowPlaying.pause();
          delete state.nowPlaying
          this.setLight(options.colorOff);
        } else if (options.playAction == 'Play / Restart') {
          nowPlaying.pause();
          nowPlaying.currentTime = 0;
          nowPlaying.play();
        }
      } else {
        const url = URL.createObjectURL(options.file);
        state.nowPlaying = new Audio(url);
        state.nowPlaying.play();
        this.setLight(options.colorOn);
        if (options.playAction == 'Loop / Stop') {
          state.nowPlaying.loop = true;
        }
        state.nowPlaying.onended = () => {
          this.setLight(options.colorOff);
        }
      }
    },
    options: {
      off: { type: 'light', label: 'Light (off)' },
      on: { type: 'light', label: 'Light (on)' },
      file: { type: 'file', label: 'Sound' },
      playAction: { 
        type: 'select', 
        label: 'Play Action',
        options: [
          { label: 'Play / Stop' },
          { label: 'Play / Overlap' },
          { label: 'Play / Restart' },
          { label: 'Loop / Stop '}
        ]
      },
    }
  }],
}

export default [
  PlaySound
]