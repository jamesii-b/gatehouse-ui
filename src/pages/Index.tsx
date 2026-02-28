import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (isAuthenticated) {
      navigate("/profile");
    } else {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  return null;
};

export default Index;
