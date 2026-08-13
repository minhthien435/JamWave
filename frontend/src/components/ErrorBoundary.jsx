import { Component } from "react";

// Bắt lỗi render để thay vì màn hình trắng, hiện thông báo thân thiện
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error.message };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center px-4 text-center">
          <p className="text-6xl mb-4">⚠️</p>
          <h1 className="text-2xl font-extrabold mb-2">Có lỗi xảy ra</h1>
          <p className="text-zinc-400 text-sm mb-6 max-w-md break-words">
            {this.state.message || "Ứng dụng gặp sự cố không mong muốn."}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-400 text-white font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-violet-500/30"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
