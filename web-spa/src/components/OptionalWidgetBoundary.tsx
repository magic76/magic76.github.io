import {Component,type ReactNode} from "react";

/** A missing optional lazy chunk must not blank the entire Crew app.
 * Route screens still use RouteErrorBoundary for actionable recovery. */
export class OptionalWidgetBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){
  // Optional dialogs, update notices and install prompts are never essential.
  // A fresh navigation can load their latest chunks without blocking pages.
 }
 render(){return this.state.failed?null:this.props.children;}
}
