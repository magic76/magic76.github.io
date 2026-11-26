import type {ReactNode} from "react";
import {Navigate} from "react-router-dom";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {learningMaterialAvailable,type LearningMaterial} from "./learningLanguages";
export function LearningMaterialGate({material,children}:{material:LearningMaterial;children:ReactNode}){
 const language=useTeacherStore(s=>s.targetLanguage),ready=useClientReady();
 if(!ready)return null;
 return learningMaterialAvailable(material,language)?<>{children}</>:<Navigate to="/learn" replace/>;
}
