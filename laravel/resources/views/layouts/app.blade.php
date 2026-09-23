<!DOCTYPE html>
<html lang="ms" class="dark h-full bg-slate-950 text-slate-100">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>{{ config('app.name', 'Khairul Fresh Food POS') }} - Laravel 13 & Livewire 4</title>
    <!-- Tailwind CSS (Play CDN for standalone portability) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        slate: {
                            750: '#293548',
                            850: '#151e2e',
                            950: '#0b1120',
                        }
                    }
                }
            }
        }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    @livewireStyles
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        [x-cloak] { display: none !important; }

        @media print {
            html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                overflow: visible !important;
            }

            /* Hide everything in print mode by default */
            body * {
                visibility: hidden !important;
            }

            /* Only display the dedicated thermal print container and its descendants */
            #thermal-print-area,
            #thermal-print-area * {
                visibility: visible !important;
            }

            #thermal-print-area {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
            }

            .no-print {
                display: none !important;
            }

            @page {
                margin: 0;
                size: auto;
            }
        }
    </style>
</head>
<body class="h-full bg-slate-950 text-slate-100 overflow-hidden flex flex-col antialiased">
    {{ $slot }}
    @livewireScripts
    <script>
        // Thermal Print Sound (Browser-Safe Web Audio API)
        window.playThermalPrintSound = function(testOnly = false) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                if (!window._printAudioCtx) window._printAudioCtx = new AudioCtx();
                const ctx = window._printAudioCtx;
                if (ctx.state === 'suspended') ctx.resume();

                // Realistic thermal printer chirp/beep sequence
                const now = ctx.currentTime;
                
                // Beep 1
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'triangle';
                osc1.frequency.setValueAtTime(880, now); // A5
                gain1.gain.setValueAtTime(0.12, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 0.08);

                // Beep 2 (higher confirmation pitch)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(1320, now + 0.1); // E6
                gain2.gain.setValueAtTime(0.12, now + 0.1);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.1);
                osc2.stop(now + 0.22);
            } catch (e) {
                console.warn('Audio not supported or permitted', e);
            }
        };

        window.triggerThermalPrint = function(soundEnabled = true) {
            if (soundEnabled) {
                window.playThermalPrintSound();
            }
            // Trigger browser print dialog for thermal receipt
            setTimeout(() => {
                window.print();
            }, 100);
        };
    </script>
</body>
</html>
