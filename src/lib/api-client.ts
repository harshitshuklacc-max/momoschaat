"use client";

export async function adminFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(url, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    clearTimeout(timeout);

    const json = await res.json().catch(() => ({
      success: false,
      error: "Invalid server response",
    }));

    if (!res.ok && json.success !== false) {
      return { success: false, error: json.error || `Request failed (${res.status})` };
    }

    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request timed out. Check database connection." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function adminUpload<T>(
  url: string,
  formData: FormData
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const json = await res.json().catch(() => ({
      success: false,
      error: "Invalid server response",
    }));

    if (!res.ok && json.success !== false) {
      return { success: false, error: json.error || `Upload failed (${res.status})` };
    }

    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Import timed out. Try a smaller PDF file." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
