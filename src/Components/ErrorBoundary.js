import React from 'react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.log(error, info);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.hasError !== prevState.hasError && this.state.hasError === true) {
      this.navigate(this.props.fallbackRoute);
    }
  }

  navigate = path => {
    const navigate = useNavigate();
    navigate(path);
  };

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export default ErrorBoundary;
