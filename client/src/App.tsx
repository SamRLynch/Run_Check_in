import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import RunDetail from "@/pages/run-detail";
import CheckIn from "@/pages/checkin";
import WhatsNew from "@/pages/whats-new";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/run/:runId" component={RunDetail} />
      <Route path="/checkin" component={CheckIn} />
      <Route path="/whats-new" component={WhatsNew} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div id="app-layout" className="app-wrapper min-h-screen overflow-x-hidden" style={{ background: "hsl(215,28%,13%)" }}>
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
