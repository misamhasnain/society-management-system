import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-100">
      <h1 className="text-2xl font-semibold text-gray-800">
        Welcome, {user?.name}
      </h1>
      <p className="text-gray-600">Role: {user?.role}</p>
      <button
        onClick={logout}
        className="bg-gray-800 text-white rounded-lg px-4 py-2 hover:bg-gray-900"
      >
        Logout
      </button>
    </div>
  );
}
