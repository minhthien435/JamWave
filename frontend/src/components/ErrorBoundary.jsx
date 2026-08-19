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
        <div className="min-h-screen bg-[#181512] text-[#EDE6D6] flex flex-col items-center justify-center px-4 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#B85C38]/20 text-[#D97C54] flex items-center justify-center mb-4 border border-[#B85C38]/30 shadow-md text-3xl">
            ⚠️
          </div>
          <h1 className="font-serif italic text-2xl font-bold mb-2 text-[#EDE6D6]">Có lỗi xảy ra</h1>
          <p className="font-mono text-xs text-[#A39282] mb-6 max-w-md break-words">
            {this.state.message || "Ứng dụng gặp sự cố không mong muốn."}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-2.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 border border-[#EDE6D6]/20"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
