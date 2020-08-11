const PlayAction = {
  TOGGLE: 0,
  OVERLAP: 1,
  REPLAY: 2,
  LOOP: 3
}
export class PlayLocalSoundAction {
  static name = 'Play Local Sound';
  static options = {
    off: { type: 'light', label: 'Light (off)' },
    on: { type: 'light', label: 'Light (on)' },
    file: { type: 'file', label: 'Sound' },
    playAction: { 
      type: 'select', 
      label: 'Play Action',
      options: [
        { label: 'Play / Stop', value: PlayAction.TOGGLE },
        { label: 'Play / Overlap', value: PlayAction.OVERLAP },
        { label: 'Play / Restart', value: PlayAction.REPLAY },
        { label: 'Loop / Stop ', value: PlayAction.LOOP }
      ]
    },
  }
  nowPlaying;
  constructor() {
    this.nowPlaying = null;
  }
  onLoad(button, options) {
    button.setLight(options.off);
  }
  onPressed(button, options) {
    if (this.nowPlaying) {
      if (options.playAction == PlayAction.TOGGLE 
          || options.playAction == PlayAction.LOOP) {
        this.nowPlaying.pause();
        delete this.nowPlaying
        button.setLight(options.off);
      } else if (options.playAction == PlayAction.REPLAY) {
        nowPlaying.pause();
        nowPlaying.currentTime = 0;
        nowPlaying.play();
      }
    } else {
      const url = URL.createObjectURL(options.file);
      this.nowPlaying = new Audio(url);
      this.nowPlaying.play();
      button.setLight(options.on);
      if (options.playAction == PlayAction.LOOP) {
        this.nowPlaying.loop = true;
      }
      this.nowPlaying.onended = () => {
        button.setLight(options.off);
      }
    }
  }
}