module.exports = {
  theme: {
    extend: {
      animation: {
        'crt-shutdown': 'shutdown 1s cubic-bezier(0.4, 0, 0.2, 1)',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        shutdown: {
          '0%': { 
            transform: 'scale(1) translateY(0)',
            opacity: '1',
            filter: 'brightness(1)'
          },
          '60%': {
            transform: 'scale(1) translateY(0)',
            opacity: '1',
            filter: 'brightness(1)'
          },
          '80%': { 
            transform: 'scale(0.9) translateY(20px)',
            opacity: '0.5',
            filter: 'brightness(0.5)'
          },
          '100%': { 
            transform: 'scale(0.8) translateY(40px)',
            opacity: '0',
            filter: 'brightness(0)'
          },
        },
        scan: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
} 