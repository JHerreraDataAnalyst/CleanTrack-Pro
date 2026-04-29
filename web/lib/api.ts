const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al comunicarse con el servidor");
  }

  return response.json() as Promise<T>;
}

export { API_URL };
