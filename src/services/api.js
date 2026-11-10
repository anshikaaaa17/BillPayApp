/**
 * API Service â€” connects React Native app to FastAPI backend
 * CCDS26-0127 | BillPay App
 *
 * Change BASE_URL to your laptop IP when testing on phone:
 * - Run: ipconfig (Windows) or ifconfig (Mac)
 * - Find your IPv4 address e.g. 192.168.1.5
 * - Set BASE_URL = "http://192.168.1.5:8000"
 */

// For Android emulator use 10.0.2.2, for real device use your laptop IP
//const BASE_URL = "http://192.168.1.100:8000";
const BASE_URL = "http://192.168.0.6:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.detail || "Request failed", response.status);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network error â€” backend not running
    throw new ApiError("Cannot connect to server. Is the backend running?", 0);
  }
}

export const api = {
  get:    (path)         => request("GET",    path),
  post:   (path, body)   => request("POST",   path, body),
  put:    (path, body)   => request("PUT",    path, body),
  delete: (path)         => request("DELETE", path),
};

export default api;