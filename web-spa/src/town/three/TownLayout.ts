/** Shared map coordinates: rendering and pedestrian collision use the same positions. */
export const LANDMARKS={
 cafe:[-6.4,-3.2],studio:[5.5,-3.2],play:[-3.2,4.0],
 gazebo:[7.45,.9],pond:[5.65,4.78]
} as const;
export const CENTER_TREES:ReadonlyArray<readonly [number,number,number]>=[
 [-8,-5.7,.95],[-7.2,-6.2,.84],[-8,1.2,.92],[-7.7,4.5,1.03],[-6.2,6.3,1.16],
 [-4.5,7.1,.9],[-2.0,7.5,.8],[1.0,6.7,.96],[8.7,-5.9,.9],[7.5,-6.5,.8],
 [2.2,-5.8,.91],[-1.2,-5.8,1.02],[9,2.7,.97],[7.65,7,.88],
 [1.25,3.65,.8],[-8.6,-1.1,.8],[-5.9,3.1,.7]
];
export const EDGE_TREES:ReadonlyArray<readonly [number,number,number,string]>=[
 [-23,-18,1.15,"#88ae92"],[-20.2,-19.4,.94,"#6fa189"],[-24.2,-9.2,.9,"#9bb996"],
 [-11,-19,1.22,"#83b296"],[-8,-13,1.02,"#b9bf91"],[0,-19,1.04,"#79a690"],
 [8,-18,1.15,"#95af9b"],[12,-19,1.1,"#86ab8f"],[22,-18,.9,"#9bac87"],
 [24,-13,1.2,"#769a83"],[23,-6,.85,"#b4bc8c"],[20,-3,1.1,"#8fad96"],
 [-23,-4,1.13,"#87b39b"],[-21,3,.86,"#8aaf9b"],[-23,9,1.2,"#96b78d"],
 [-19,20,1.1,"#7aab93"],[-13,19,1.2,"#a0b894"],[-7,17,.96,"#95bc9b"],
 [0,19,1.05,"#8fac87"],[7,18,1.12,"#81ad8e"],[22,19,1.12,"#a2b58e"],
 [24,8,1.1,"#89a98d"],[23,15,.96,"#83a894"],[-8,-10.7,.91,"#87b69a"],
 [7.8,10.5,.85,"#9caf8d"],[-8.2,6.65,1.0,"#8fba96"]
];
export const MARKET_STALL_SPOTS:ReadonlyArray<readonly [number,number]>=[
 [-19,-14],[-13.1,-14.2],[-19,-9.6],[-13.1,-9.6]
];
export const GROVE_TREE_SPOTS:ReadonlyArray<readonly [number,number,number]>=[
 [11.4,-15.1,.8],[12.3,-10.8,.92],[15,-16.7,1.04],
 [20.3,-15.8,.8],[20.5,-8.2,.92],[15,-7.3,1.04]
];
export const STORY_HOUSES:ReadonlyArray<readonly [number,number,string,string]>=[
 [-18.8,9.4,"#d9bbc3","#ac8693"],[-13.3,9,"#b7ccbf","#7eaa98"],
 [-18.8,14.8,"#edcfac","#b18c84"],[-13.25,15,"#c4d4dd","#93a9b9"]
];
export const GROVE_CABIN=[17.85,-11.7] as const;
export const HARBOR_LIGHTHOUSE=[19,10] as const;
