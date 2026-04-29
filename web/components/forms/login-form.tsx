"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-login";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  remember: z.boolean().default(false)
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "", remember: true }
  });

  const loginMutation = useLogin();
  const rootError = form.formState.errors.root?.message;

  const onSubmit = (values: LoginValues) => {
    form.clearErrors("root");
    loginMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Sesion iniciada", "Redirigiendo al dashboard...");
        router.replace("/");
      },
      onError: (error) => {
        toast.error("Error al iniciar sesion", error.message);
        form.setError("root", {
          type: "server",
          message: error.message || "No se pudo iniciar sesion. Intenta nuevamente."
        });
      }
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Iniciar sesion</CardTitle>
        <CardDescription>Accede al dashboard interno de CleanTrack-Pro</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="admin@cleantrack.com" {...form.register("email")} />
            <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input id="password" type="password" placeholder="********" {...form.register("password")} />
            <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" {...form.register("remember")} />
            Recordar sesion
          </label>
          <Button className="w-full" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? "Ingresando..." : "Entrar"}
          </Button>
          {rootError && <p className="text-sm text-destructive">{rootError}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
