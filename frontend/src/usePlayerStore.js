import {create} from 'zustand';
export const usePlayerStore = create((set) =>({
    currentSong:null,
    isPlaying:false,

    // set currentsong
    setCurrentSong: (song) => set({currentSong:song, isPlaying:true}),
    // toggle on/off
    togglePlay: () => set((state) =>({isPlaying:!state.isPlaying})),
    // play/pause
    setIsPlaying:(value) =>set({isPlaying:value}),
 }))