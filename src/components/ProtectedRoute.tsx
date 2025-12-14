import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "@/lib/auth";

type Props = {
  children: React.ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
