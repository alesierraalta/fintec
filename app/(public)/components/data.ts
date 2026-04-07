/**
 * Static data for the landing page.
 * All content here is verifiable or clearly marked as placeholder.
 */

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Navigation links
export const navLinks: NavLink[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Iniciar Sesión', href: '/auth/login' },
  { label: 'Registrarse', href: '/auth/register' },
];

// Testimonials — clearly marked as early access feedback
export const testimonials: Testimonial[] = [
  {
    quote:
      'FinTec me permitió tener un control real de mis finanzas en bolívares y dólares. Las tasas actualizadas son un game changer.',
    author: 'María G.',
    role: 'Usuario de early access',
  },
  {
    quote:
      'Por fin una app que entiende la realidad financiera de Venezuela. La gestión de cuentas y transacciones es exactamente lo que necesitaba.',
    author: 'Carlos R.',
    role: 'Usuario de early access',
  },
  {
    quote:
      'La interfaz es limpia y rápida. Poder ver las tasas del BCV y Binance en un solo lugar me ahorra mucho tiempo cada día.',
    author: 'Ana P.',
    role: 'Usuario de early access',
  },
];

// FAQ items
export const faqItems: FAQItem[] = [
  {
    question: '¿Qué es FinTec?',
    answer:
      'FinTec es una aplicación de finanzas personales diseñada para el mercado venezolano. Te permite gestionar cuentas, transacciones, presupuestos y más, con tasas de cambio actualizadas del BCV y Binance en tiempo real.',
  },
  {
    question: '¿FinTec es gratuito?',
    answer:
      'Sí, FinTec ofrece un plan gratuito con funcionalidades esenciales. También contamos con un plan Premium con características avanzadas para usuarios que necesitan más herramientas de gestión financiera.',
  },
  {
    question: '¿Cómo se actualizan las tasas de cambio?',
    answer:
      'Las tasas del BCV se obtienen directamente de la fuente oficial del Banco Central de Venezuela. Las tasas de Binance se obtienen del mercado P2P. Ambas se actualizan automáticamente para que siempre tengas la información más reciente.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer:
      'Sí. Utilizamos encriptación de nivel bancario y autenticación segura para proteger tu información. Tu privacidad y seguridad son nuestra prioridad.',
  },
  {
    question: '¿En qué dispositivos puedo usar FinTec?',
    answer:
      'FinTec está disponible como aplicación web accesible desde cualquier navegador. También estamos desarrollando aplicaciones nativas para iOS y Android a través de Capacitor.',
  },
  {
    question: '¿Puedo gestionar múltiples cuentas?',
    answer:
      'Sí, puedes crear y gestionar múltiples cuentas en diferentes monedas (bolívares, dólares, euros, etc.) y realizar transferencias entre ellas.',
  },
];

// Footer navigation columns
export const footerColumns: FooterColumn[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Características', href: '/#caracteristicas' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Tasas en Vivo', href: '/#tasas-en-vivo' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre FinTec', href: '/' },
      { label: 'Contacto', href: '/auth/register' },
      { label: 'Waitlist', href: '/waitlist' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de Servicio', href: '/terms' },
      { label: 'Política de Privacidad', href: '/privacy' },
    ],
  },
];

// Social links
export const socialLinks = [
  {
    label: 'Twitter/X',
    href: 'https://x.com/fintec',
    icon: 'twitter',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/fintec',
    icon: 'github',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/fintec',
    icon: 'linkedin',
  },
];

// Features
export const features: FeatureItem[] = [
  {
    icon: 'BarChart3',
    title: 'Gestión Completa',
    description:
      'Administra todas tus cuentas, transacciones y presupuestos desde una sola aplicación',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    icon: 'Shield',
    title: 'Seguridad Avanzada',
    description:
      'Tus datos están protegidos con encriptación de nivel bancario y autenticación segura',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  {
    icon: 'Smartphone',
    title: 'Diseño iOS Nativo',
    description:
      'Interfaz elegante y familiar que se siente como una app nativa de iOS',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  {
    icon: 'Zap',
    title: 'Tasas en Tiempo Real',
    description:
      'Accede a tasas del BCV y Binance P2P actualizadas automáticamente 24/7',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
];
