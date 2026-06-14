"use client";

export async function adminFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const json = await res.json();
  return json;
}

export async function adminUpload<T>(
  url: string,
  formData: FormData
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, { method: "POST", body: formData });
  return res.json();
}
