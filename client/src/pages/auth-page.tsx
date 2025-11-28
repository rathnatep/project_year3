import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("student");

  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ user: any; token: string }>("POST", "/api/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.user.name}`,
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ user: any; token: string }>("POST", "/api/auth/register", {
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: registerRole,
      });
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      toast({
        title: "Account created!",
        description: `Welcome to ClassRoom, ${data.user.name}`,
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const handleSwitchMode = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterRole("student");
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-semibold">
              {isLogin ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isLogin
                ? "Sign in to your ClassRoom account"
                : "Join ClassRoom to manage your classes"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLogin ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loginMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  registerMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    data-testid="input-register-email"
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    data-testid="input-register-password"
                  />
                </div>
                <div className="space-y-3">
                  <Label>I am a...</Label>
                  <RadioGroup
                    value={registerRole}
                    onValueChange={setRegisterRole}
                    data-testid="radio-role"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="student" id="student" data-testid="radio-student" />
                      <Label htmlFor="student" className="font-normal cursor-pointer">
                        Student
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teacher" id="teacher" data-testid="radio-teacher" />
                      <Label htmlFor="teacher" className="font-normal cursor-pointer">
                        Teacher
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={handleSwitchMode}
                className="font-medium text-primary hover:underline"
                data-testid="button-toggle-auth"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
              <GraduationCap className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Classroom Management Made Simple
          </h2>
          <p className="text-muted-foreground text-lg">
            Create groups, assign tasks, and track submissions all in one place.
            Whether you're a teacher or a student, ClassRoom has everything you need.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">Easy</div>
              <div className="text-sm text-muted-foreground">Group Setup</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">Fast</div>
              <div className="text-sm text-muted-foreground">Submissions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">Clear</div>
              <div className="text-sm text-muted-foreground">Grading</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
