import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isOrgMember, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (isAuthenticated) {
      // If the user has no org yet, send them to the org-setup page first
      navigate(isOrgMember ? "/profile" : "/org-setup", { replace: true });
    } else {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, isOrgMember, navigate]);

  return null;
};

export default Index;
