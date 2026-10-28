import{logout}from"../../../server/crew-auth.mjs";
export const onRequestPost=context=>logout(context);
