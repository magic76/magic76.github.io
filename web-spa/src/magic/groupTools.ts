// Separate, bounded world action advertised alongside the existing Magic tools.
// All arguments are validated again by applyMagicCommand before modifying state.
export const MAGIC_GROUP_TOOLS=[{functionDeclarations:[{
 name:"move_creatures",
 description:"Guide a group of existing dragons, owls or foxes toward separated positions near a destination. Omit kinds to move every creature. Their paths go around the castle instead of through it.",
 parameters:{type:"OBJECT",properties:{
  kinds:{type:"ARRAY",items:{type:"STRING",enum:["dragon","owl","fox"]}},
  x:{type:"NUMBER",description:"Relative horizontal destination from -1 to 1"},
  z:{type:"NUMBER",description:"Relative depth destination from -1 to 1"}
 },required:["x","z"]}
}]}];
