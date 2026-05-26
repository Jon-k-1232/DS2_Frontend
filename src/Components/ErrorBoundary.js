import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.hasError !== prevState.hasError && this.state.hasError === true) {
      const fallback = this.props.fallbackComponent || this.props.fallbackRoute;
      if (fallback) {
        // Use window.location for imperative navigation from a class component.
        // (useNavigate() cannot be called inside class methods.)
        window.location.href = fallback;
      }
    }
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export default ErrorBoundary;
