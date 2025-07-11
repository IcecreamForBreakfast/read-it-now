import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { loginUser, logoutUser, sendMagicLink, getCurrentUser } from "@/lib/auth";
import type { LoginData, MagicLinkData } from "@shared/schema";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "user"], data);
      setLocation("/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["/api/articles"] });
      queryClient.removeQueries({ queryKey: ["/api/tags"] });
      setLocation("/");
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: sendMagicLink,
  });

  return {
    user: user?.user ?? null,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    sendMagicLink: magicLinkMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isMagicLinkLoading: magicLinkMutation.isPending,
    loginError: loginMutation.error,
    magicLinkError: magicLinkMutation.error,
  };
}
