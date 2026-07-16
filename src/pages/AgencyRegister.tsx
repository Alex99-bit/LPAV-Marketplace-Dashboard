import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function AgencyRegister() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auth/agency", { replace: true });
  }, [navigate]);

  return null;
}
