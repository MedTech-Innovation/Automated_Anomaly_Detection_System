import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SkinDetection from "./pages/SkinDetection";
import EyeDetection from "./pages/EyeDetection";
import LungDetection from "./pages/LungDetection";
import TumorDetection from "./pages/TumorDetection";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skin-detection"
              element={
                <ProtectedRoute>
                  <SkinDetection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/eye-detection"
              element={
                <ProtectedRoute>
                  <EyeDetection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lung-detection"
              element={
                <ProtectedRoute>
                  <LungDetection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tumor-detection"
              element={
                <ProtectedRoute>
                  <TumorDetection />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
