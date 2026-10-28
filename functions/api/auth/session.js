import{sessionInfo}from"../../../server/crew-auth.mjs";
export const onRequestGet=context=>sessionInfo(context);
