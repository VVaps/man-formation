export default function Loader() {
    return (
      <div className="flex justify-center items-center space-x-2">
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce" />
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce delay-100" />
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce delay-200" />
      </div>
    );
  }