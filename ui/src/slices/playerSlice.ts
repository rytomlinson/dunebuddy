import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { loadPlayerName, savePlayerName } from '../utils/storage';

export interface PlayerState {
  /** Name this device last voted under, used to prefill the ballot. */
  name: string;
}

const initialState: PlayerState = { name: loadPlayerName() };

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setPlayerName(state, action: PayloadAction<string>) {
      state.name = action.payload;
      savePlayerName(action.payload);
    },
  },
});

export const { setPlayerName } = playerSlice.actions;
export const playerReducer = playerSlice.reducer;
export const selectPlayerName = (state: RootState) => state.player.name;
