const AuthImagePattern = ({ title, subtitle }) => {
    return (
        <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300 p-12">
            <div className="relative max-w-md text-center">
                <div className="relative group mb-8 flex justify-center">
                    <img
                        src="/login_clone_img.png"
                        alt="Login"
                        className="rounded-3xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500 ease-in-out max-w-[400px] max-h-[400px] object-cover"
                        style={{
                            perspective: '1000px',
                            transform: 'rotateY(-5deg) rotateX(3deg)',
                        }}
                    />
                    <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl opacity-20"></div>
                </div>
                <h2 className="text-3xl font-bold text-primary mb-3 drop-shadow-md">{title}</h2>
                <p className="text-base-content/70 text-lg">{subtitle}</p>
            </div>
        </div>
    );
};

export default AuthImagePattern;