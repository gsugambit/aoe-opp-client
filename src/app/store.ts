import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { aoe4OppApi } from '../features/aoe4-opp/aoe4OppApi';

export const store = configureStore({
  reducer: {
    [aoe4OppApi.reducerPath]: aoe4OppApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(aoe4OppApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
