import { AppUiProvider } from "@canva/app-ui-kit";
import { createRoot } from "react-dom/client";
// import { App } from "./app";
import {AppTest} from "./components/test"
import "@canva/app-ui-kit/styles.css";

const root = createRoot(document.getElementById("root") as Element);
function render() {
  root.render(
    <AppUiProvider>
      {/* <App /> */}
      <AppTest/>
    </AppUiProvider>
  );
}

render();

if (module.hot) {
  module.hot.accept("./app", render);
}
