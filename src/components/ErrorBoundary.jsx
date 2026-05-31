import { Component } from 'react'
import { NAVY, RED } from '../constants'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', this.props.name || '', error, info.componentStack)
  }

  reset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 16 }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
          {this.props.name ? `Error en ${this.props.name}` : 'Ocurrió un error inesperado'}
        </div>
        <div style={{ fontSize: 12, color: '#888', maxWidth: 420, textAlign: 'center' }}>
          {this.state.error?.message || 'Error desconocido'}
        </div>
        <button
          onClick={() => this.reset()}
          style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    )
  }
}
