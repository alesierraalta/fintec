import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';
import { Shield, Smartphone, Zap, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'FinTec Waitlist - Acceso Anticipado',
    description: 'Sé el primero en experimentar la nueva era de las finanzas personales en Venezuela. Tasas reales, gestión total.',
};

export default function WaitlistPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
            {/* Background gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

            {/* Nav */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10">
                <Link href="/" className="flex items-center space-x-2">
                    <div className="relative w-8 h-8 md:w-10 md:h-10">
                        <Image
                            src="/finteclogodark.jpg"
                            alt="FinTec"
                            fill
                            className="rounded-lg object-contain"
                        />
                    </div>
                    <span className="font-bold text-xl tracking-tight hidden sm:block">FinTec</span>
                </Link>
                <Link href="/auth/login">
                    <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Iniciar Sesión
                    </button>
                </Link>
            </nav>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">

                <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
                    <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6 animate-fade-in-up">
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                        Acceso Anticipado Limitado
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent animate-fade-in-up [animation-delay:200ms]">
                        El Futuro Financiero <br className="hidden sm:block" />
                        <span className="text-primary">Está Llegando.</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up [animation-delay:400ms]">
                        Deja de luchar con múltiples apps y tasas desactualizadas.
                        Únete al waitlist para obtener acceso prioritario y beneficios exclusivos de lanzamiento.
                    </p>

                    <div className="animate-fade-in-up [animation-delay:600ms]">
                        <WaitlistForm />
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-4 animate-fade-in-up [animation-delay:800ms]">
                    {[
                        {
                            icon: Zap,
                            title: "Tasas en Tiempo Real",
                            desc: "Monitoreo 24/7 de BCV y Binance P2P sin retrasos."
                        },
                        {
                            icon: Smartphone,
                            title: "Experiencia Nativa",
                            desc: "Diseño fluido optimizado para iOS y Android."
                        },
                        {
                            icon: Shield,
                            title: "Privacidad Total",
                            desc: "Tus datos financieros encriptados y seguros."
                        }
                    ].map((feature, idx) => (
                        <div key={idx} className="bg-card/50 backdrop-blur-sm border border-border/50 p-6 rounded-2xl hover:bg-card/80 transition-colors">
                            <feature.icon className="h-8 w-8 text-primary mb-4" />
                            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.desc}</p>
                        </div>
                    ))}
                </div>

            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/10">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>&copy; {new Date().getFullYear()} FinTec. Todos los derechos reservados.</p>
                    <div className="flex space-x-6">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacidad</Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Términos</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
