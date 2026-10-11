// The sound of every track as a formula (KaTeX), shown by the visualiser when you hover a note.
// song → track → [main formula, …definitions]. A track's own `formula` field (string or array)
// takes precedence, so new songs can carry their formulas themselves.
//
// Notation: x beats, T seconds since the start, t seconds since the note/hit, τ beats since the hit,
// f the note's frequency, η white noise ∈ [−1, 1), \saw/\sq/\tri waveforms of phase ∫f dt,
// \Pi_d pulse of duty d, \LP/\HP/\BP_{f_c} filters, \SS_N an N-voice supersaw,
// \Rev reverb, \Dly echo, \Cho chorus, \Tape tape (wow & flutter + saturation), \vol 4-bit volume.
const R = String.raw

// shared instruments
const KICK = (a, d, f0, f1, s, drive) => R`y = ${a}\,e^{-${d}\tau}\tanh\!\Big(${drive}\sin 2\pi\!\int\!\big(${f0} + ${f1}\,e^{-${s}\tau}\big)\,dT\Big)`
const PIANO = [
  R`P(f,t,v) = 0.35\sum_{k=1}^{6}\frac{v^{0.4+0.25k}}{k^{1.15}}\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\big)\big(\sin 2\pi f_k t+\sin(2\pi\cdot1.0006 f_k t+k)\big) + 0.15v\,e^{-90t}\sin 2\pi\,2.7ft`,
  R`f_k = kf\sqrt{1+0.0004k^2},\qquad d_k = (0.45+0.4k)\sqrt{f/260}`,
]
const RHODES = R`E(f,t,v) = v\Big(\sin\!\big(2\pi ft + (0.5+1.8v^2)e^{-4t}\sin 2\pi ft\big)\,e^{-t/(1+250/f)} + 0.2v\,e^{-35t}\sin 2\pi\,14ft\Big)`
const VIBES = R`V(f,t,v) = v\,e^{-t/2.2}\big(\sin 2\pi ft + 0.3e^{-5t}\sin 2\pi\,3.98ft + 0.08e^{-20t}\sin 2\pi\,9.8ft\big)`
const UPRIGHT = R`U(f,t,v) = v\big(e^{-1.2t}\sin 2\pi ft + 0.45e^{-2.5t}\sin 4\pi ft + 0.18e^{-4.5t}\sin 6\pi ft + 0.4e^{-60t}\sin 2\pi\,1.5ft\big)`
const FLUTE = [
  R`Fl = a\big(0.6\sin 2\pi\!\int\! g + 0.1\sin 4\pi\!\int\! g + 0.06\,\BP_{2g}\,\eta + 0.5e^{-25t}\,\HP_{3000}\,\eta\big)`,
  R`g = f\cdot 2^{\,0.2\min(1,\,t/0.6)\sin(2\pi\cdot 5.2T)/12}`,
]
const STRINGS = R`S = \LP\,\HP\sum_{j}\sum_{u=-1}^{1}\saw\!\Big(f_j\,2^{\,(0.09u + 0.12\sin 2\pi r_{j,u}T)/12}\Big)`
const MEOW = [
  R`f = 698.46\cdot 2^{\,(n + \beta(u) + v)/12},\qquad \beta(u) = 3\sin(\pi u^{0.7}) - 2u^2,\qquad v = 0.35\min(1,2u)^2\sin 2\pi\,6T`,
  R`F_i(u):\ \text{«и»}\to\text{«а»}\to\text{«у»},\qquad M(u) = \big(350 + 7500\,S_{0,0.18}(u)\big)\big(1 - 0.75\,S_{0.7,1}(u)\big)`,
]
const CHIP = R`\Pi_d(f) = \tfrac12\big(\saw(\varphi) - \saw(\varphi + d)\big),\quad \varphi = \!\int\! f\,dT,\qquad \vol(v) = \lfloor 15v\rfloor/15`
const SAMPLE = [R`y = g\cdot\text{сэмпл}(t)\quad\text{(звук, брошенный на устройство в Ableton)}`]

export default {
  example: {
    kick: [R`y = 0.8\,k\,\sin 2\pi\!\int 45\cdot 2^{3k^4}\,dT,\qquad k = e^{-8\,(x \bmod 1)}`],
    arp: [R`y = 0.4\,e^{-6\,(2x \bmod 1)}\,\saw\!\big(220\cdot 2^{n/12}\big)`, R`n = (0, 3, 7, 10)_{\lfloor 2x\rfloor \bmod 4} + 12\,(\lfloor x/4\rfloor \bmod 2)`],
    sub: [R`y = 0.3\,\sin(2\pi\cdot 55\,T)\cdot\frac{x \bmod 4}{4}`],
  },

  synthwave: {
    pads: [R`y = \Rev\Big[0.15\,\LP_{f_c}\sum_{j=1}^{3}\SS_5\big(164.81\cdot 2^{c_{k,j}/12}\big)\Big]`, R`f_c = 500\cdot 2^{2x/16}\ (\text{интро}),\ 2000;\qquad k = \lfloor x/8\rfloor \bmod 4`],
    arp: [R`y = \Dly\Big[a\,e^{-10s}\,\LP_{1200+3000e^{-20s}}\,\sq\big(164.81\cdot 2^{n/12}\big)\Big],\qquad s = x \bmod \tfrac14`, R`n = (c_0, c_1, c_2, c_0{+}12, c_1{+}12)_{p} + 12,\quad p = (0,1,2,3,4,3,2,1)_{\lfloor 4x\rfloor \bmod 8}`],
    bass: [R`y = 0.42\,e^{-5s}\big(1 - 0.7e^{-7\tau_K}\big)\tanh\!\Big(1.5\,\LP_{250+2800e^{-14s}}\big[\saw(f) + 0.5\saw(1.005f)\big]\Big)`, R`f = 82.41\cdot 2^{(b_k + 12\,o)/12},\quad o = (0,0,1,0)_{\lfloor 4x\rfloor \bmod 4}`],
    kick: [KICK(0.85, 5, 45, 160, 35, 1.3)],
    snare: [R`d = 0.6e^{-12\tau}\,\HP_{600}\,\eta + 0.5e^{-25\tau}\sin 2\pi\,200t`, R`y = d + 1.3\,[\tau < 0.45]\,\big(\Rev[d] - d\big)\quad\text{(gated reverb)}`],
    hats: [R`y = 0.5\,a\,e^{-50s}\,\HP_{8000}\,\eta,\qquad a = (0.4, 0.25, 1, 0.25)_{\lfloor 4x\rfloor \bmod 4}`],
    toms: [R`y = \Rev\Big[0.6\,e^{-6\tau}\tanh\!\big(1.5\sin 2\pi\!\int F_i\,(1 + 0.6e^{-25\tau})\,dT\big)\Big],\qquad F = (180, 140, 105)`],
    lead: [R`y = \Rev\Big[\Dly\big[0.42\,a\,\LP_{4500}\big(\SS_7(f) + 0.3\sq(f/2)\big)\big]\Big]`, R`f = 329.63\cdot 2^{(n + v)/12},\qquad v = 0.2\min(1, \tau/0.75)\sin 2\pi\,5.5T`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  dnb: {
    pads: [R`y = \Rev\Big[a\,\LP_{f_c}\sum_j \SS_5\big(174.61\cdot 2^{c_{k,j}/12}\big)\Big],\qquad f_c = 400\cdot 2^{3.5x/16}`],
    riser: [R`y = 0.5\,\rho\;\BP_{400\cdot 2^{5\rho}}\,\eta,\qquad \rho = \Big(\frac{x - 8}{8}\Big)^2`],
    bass: [R`y_{L,R} = v\Big(0.25\tanh\!\big(2\,\LP_{f_c}\saw(2f\cdot 1.007^{\pm 1})\big) + 0.25\sin 2\pi\!\int\! f\Big)`, R`f_c = 120\cdot 2^{5w},\quad w = \tfrac12\big(1 - \cos 2\pi r x\big),\quad r = 2^{(0,1,0,2)_{\lfloor x\rfloor \bmod 4}},\quad v = 1 - 0.6e^{-8\tau_K}`, R`f = 43.65\cdot 2^{b_k/12}`],
    kick: [R`y = 0.9\,e^{-4\tau}\tanh\!\Big(1.6\sin 2\pi\!\int\!\big(48 + 220e^{-50\tau}\big)dT\Big) + 0.15\,e^{-150\tau}\eta`],
    snare: [R`y = \Rev\Big[0.6e^{-9\tau}\,\HP_{900}\,\eta + e^{-16\tau}\big(0.45\sin 2\pi\,185t + 0.2\sin 2\pi\,330t\big)\Big]`],
    hats: [R`y = \ell\,a\,e^{-45\tau}\,\HP_{7000}\,\eta,\qquad \tau = x \bmod \tfrac12`],
    crash: [R`y = \Rev\big[0.35\,e^{-1.2\tau}\,\HP_{4000}\,\eta\big]`],
    hook: [R`y = \Rev\Big[\Dly\big[0.3\,e^{-10\tau}\,\LP_{600+4000e^{-14\tau}}\,\sq\big(174.61\cdot 2^{n/12}\big)\big]\Big],\qquad n = c_{k,p_i} + 12`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  hardstyle: {
    pads: [R`y = \Rev\Big[0.3\,\LP_{0.6f_c}\sum_j \SS_5\big(220\cdot 2^{P_j + 0.25}\big)\Big],\qquad P_j = -0.25 + c_{k,j}/12`],
    lead: [R`y = \Rev\Big[0.75\,\LP_{f_c}\big(\SS_7(f) + 0.5\,\SS_5(2f)\big)\Big],\qquad f = 110\cdot 2^{\,(4(L - 0.3) + 12)/12}`, R`L = 0.3 + (n_k - 12)/4,\quad k = \lfloor 2x\rfloor \bmod 16`],
    riser: [R`y = 0.5\,a\;\BP_{300\cdot 2^{4(R + 2.5)}}\,\eta,\qquad a = \frac{R + 2.5}{1.34},\qquad R = \frac{(x - 16)^2}{48} - 2.5`],
    snare: [R`y = \Rev\Big[1.2\,\ell\,e^{-25s/\rho}\big(0.7\,\BP_{2200}\,\eta + 0.4\sin 2\pi\,190T\big)\Big],\qquad \rho = 2^{\lfloor (x-16)/2\rfloor}`],
    kick: [R`y = \begin{cases} 0.9\tanh\!\big(4\sin 2\pi\!\int 110\cdot 2^{K}\,dT\big) & r < 0.55 \\[2pt] 0.72\tanh\!\big(3\sin 2\pi f_{\text{root}}T\big)\cdot\dfrac{K + 1.9}{1.6} & r \ge 0.55\end{cases}`, R`K = \begin{cases}5e^{-14r} - 1 - r/2 & r < 0.55\\ -1.9 + 1.6w^2 & \text{иначе}\end{cases}\qquad r = x \bmod 1,\ w = \frac{r - 0.55}{0.45}`],
    hats: [R`y = 0.4\,\HP_{8000}\big(e^{-30h}\,\eta\big),\qquad h = (x - 0.5) \bmod 1`],
    clap: [R`y = \Rev\big[1.6\,\BP_{1500}\big(e^{-10v}\,\eta\big)\big],\qquad v = (x \bmod 2) - 1`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  phonk: {
    cowbell: [R`y = \Rev\Big[\Dly\Big[0.4\,\LP\,\HP_{300}\tanh\!\Big(2.5\,\BP_{1.8f}\big[(\sq(f) + \sq(1.48f))(e^{-30\tau} + 0.3e^{-6\tau})\big]\Big)\Big]\Big]`, R`f = 587.33\cdot 2^{n/12}`],
    b808: [R`y = 0.5\,e^{-0.9\tau}\,\LP_{2500}\tanh\!\Big(3\sin 2\pi\!\int\! f\,dT\Big),\qquad f \to 49\cdot 2^{n/12}\ \ (\text{глайд 40 мс})`],
    kick: [KICK(0.8, 12, 50, 180, 40, 1.5)],
    clap: [R`y = \Rev\Big[1.3\,E(\tau)\,\BP_{1500}\,\eta + 0.3e^{-20\tau}\sin 2\pi\,200t\Big]`, R`E(\tau) = 0.6e^{-7\tau} + \sum_{i=0}^{2} e^{-300(\tau - 0.012i)}\,[\tau \ge 0.012i]`],
    hats: [R`y = 0.35\,a\,e^{-60\tau}\,\HP_{8000}\,\eta,\qquad \tau = \frac{\rho x \bmod 1}{\rho},\quad \rho \in \{4, 6, 8\}`],
    vinyl: [R`y = \LP_{4000}\big(0.6\,\eta\,[\eta' > 0.9993] + 0.004\,\eta\big)`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  gothic: {
    organ: [R`y = \Rev\Big[0.12\,w(x)\sum_{i \in \{1,2,3,4,6\}} g_i\sin(2\pi\,i\cdot 73.42\,T)\Big],\qquad g = (1, 0.7, 0.4, 0.35, 0.2)`, R`w = \min\!\big(1, \tfrac{x}{4}, \tfrac{18 - x}{4}\big)`],
    choir: [R`y = \Rev\Big[0.48\,a(s)\sum_{i=1}^{3}\frac{g_i}{Q_i}\,\BP_{F_i}\Big(\sum_{j}\sum_{u=-1}^{1}\saw\big(146.83\cdot 2^{(c_{k,j} + v + 0.07u)/12}\big)\Big)\Big]`, R`F_i = (1 - m)\,\text{Ah}_i + m\,\text{Oo}_i,\quad m = \tfrac12\big(1 - \cos\tfrac{2\pi x}{32}\big),\quad a(s) = (1 - e^{-1.2s})\min(1, 2(8 - s))`, R`v = 0.25\,(1 - e^{-s})\sin 2\pi rT`],
    bells: [R`y = \Rev\Big[0.19\sum_{i=1}^{9} a_i\,e^{-d_i t}\sin(2\pi r_i f t)\Big]`, R`r = (0.5,\,1,\,1.183,\,1.506,\,2,\,2.514,\,2.662,\,3.011,\,4.166)`],
    impact: [R`y = \Rev\Big[0.8e^{-1.5\tau}\sin 2\pi\!\int\!(38 + 80e^{-6\tau})\,dT + 0.4e^{-3\tau}\,\LP_{900}\,\eta\Big]`],
    b808: [R`y = 0.45\,e^{-0.5\tau}\,\LP_{1800}\tanh\!\Big(2.2\sin 2\pi\!\int\! f\,dT\Big),\qquad f \to 73.42\cdot 2^{(b_k + v)/12}`],
    kick: [KICK(0.7, 10, 50, 200, 40, 1.5)],
    snare: [R`y = \Rev\big[0.6e^{-9\tau}\,\HP_{500}\,\eta + 0.4e^{-18\tau}\sin 2\pi\,180t\big]`],
    hats: [R`y = 0.3\,e^{-50\tau}\,\HP_{7500}\,\eta,\qquad \tau = \frac{\rho x \bmod 1}{\rho},\quad \rho \in \{2, 4, 6\}`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  classical: {
    cello: [R`y = \Rev\Big[0.4\,G\Big(0.3\,\LP\,s + \sum_{i=1}^{4}\frac{g_i}{Q_i}\BP_{0.6R_i}\,s\Big)\Big],\qquad s = \saw\big(146.83\cdot 2^{(b_k + v)/12}\big) + 0.04\eta`, R`v = 0.18\min(1, t/0.4)\sin 2\pi\,5.6T,\qquad R = (300, 520, 1100, 2700)\ \text{Гц — резонансы корпуса}`],
    harpsichord: [R`y_i \leftarrow 0.996\,\big(0.65\,y_i + 0.35\,y_{i+1}\big),\qquad N = \frac{44100}{f}\quad\text{(Карплус — Стронг)}`, R`y_i^{(0)} = v\,\big(\eta_i - \eta_{i - N/7}\big)\quad\text{(щипок в 1/7 струны)}`],
    timpani: [R`y = \Rev\Big[0.35\tanh\Big(\sum_{m} a_m e^{-\lambda_m t}\sin 2\pi r_m\varphi(t)\Big) + 0.2e^{-30t}\,\LP_{300}\,\eta\Big]`, R`\varphi(t) = ft + \frac{0.03f\,(1 - e^{-20t})}{20},\qquad r = (1,\,1.504,\,1.742,\,2,\,2.245)`],
    violin1: [R`n(x) = V(x - 16),\qquad y = \Rev\Big[0.5\,G\Big(0.3\,\LP\,s + \sum_i\frac{g_i}{Q_i}\BP_{R_i}\,s\Big)\Big],\quad s = \saw\big(293.66\cdot 2^{(n + v)/12}\big)`, R`\text{канон: скрипка } j \text{ играет } V(x - 16(j+1))`],
    violin2: [R`n(x) = V(x - 32),\qquad y = \Rev\Big[0.5\,G\Big(0.3\,\LP\,s + \sum_i\frac{g_i}{Q_i}\BP_{R_i}\,s\Big)\Big],\quad s = \saw\big(293.66\cdot 2^{(n + v)/12}\big)`, R`\text{канон: скрипка } j \text{ играет } V(x - 16(j+1))`],
    violin3: [R`n(x) = V(x - 48),\qquad y = \Rev\Big[0.5\,G\Big(0.3\,\LP\,s + \sum_i\frac{g_i}{Q_i}\BP_{R_i}\,s\Big)\Big],\quad s = \saw\big(293.66\cdot 2^{(n + v)/12}\big)`, R`\text{канон: скрипка } j \text{ играет } V(x - 16(j+1))`],
  },

  kawaii: {
    pads: [R`y = \Rev\Big[0.18\,P(x)\,\LP_{f_c}\sum_j \SS_5\big(220\cdot 2^{(c_{k,j} + tr)/12}\big)\Big],\qquad f_c = 300 + 5000\,(x/16)^2`, R`P(x) = 1 - 0.6e^{-8\,(x \bmod 1)}\quad\text{(пампинг под бочку)}`],
    sparkles: [R`y = \Rev\Big[\Dly\Big[0.16\sum_{j} \ell\,e^{-4t_j}\sin\!\big(2\pi f_j t_j + 2e^{-6t_j}\sin 2\pi\,3.5f_jt_j\big)\Big]\Big]`],
    chops: [R`y = \Rev\Big[\Dly\Big[0.9\,a\,P(x)\sum_{i=1}^{3}\frac{g_i}{Q_i}\BP_{1.15F_i}\big(\saw(f) + 0.05\eta\big)\Big]\Big]`, R`f = 220\cdot 2^{(n + s + 0.15\sin 2\pi\,6T)/12},\qquad F \in \{\text{«а»}, \text{«и»}\}`],
    lead: [R`y = \Rev\Big[\Dly\Big[0.22\,\LP_{6000}\big(\saw(\varphi) - \saw(\varphi + \tfrac14)\big)\Big]\Big],\qquad \varphi = \!\int\! f`, R`f = 440\cdot 2^{(n + v)/12}\cdot\begin{cases}2 & t < 0.02\\ 1\end{cases},\qquad v = 0.25\sin 2\pi\,6.5T`],
    bass: [R`y = 0.45\,e^{-3\tau}P(x)\Big(0.6\,\LP_{400+2500e^{-15\tau}}\sq(f) + 0.5\sin 2\pi\!\int\! f\Big),\qquad f = 55\cdot 2^{n/12}`, R`n = b_k + 12\,(\lfloor 2x\rfloor \bmod 2) + tr`],
    kick: [KICK(0.8, 6, 48, 220, 40, 1.4)],
    clap: [R`y = \Rev\big[v\,E(t)\,\BP_{1500}\,\eta\big],\qquad E(t) = 0.5e^{-18t} + \sum_{m=0}^{2}e^{-300(t - 0.012m)}[t \ge 0.012m]`],
    hats: [R`y = 0.3\,a\,e^{-60s}\,\HP_{8000}\,\eta + 0.15\,e^{-12\tau_o}\,\HP_{6000}\,\eta`],
    fx: [R`y = \Rev\Big[0.6\Big(\HP_{4000}\big(0.3e^{-1.2t}\eta\big) + u^2\big(0.25\,\BP_{500\cdot 16^u}\,\eta + 0.06\sin 2\pi\!\int 400\cdot 2^{3u}\big)\Big)\Big]`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  meow: {
    purr: [R`y = 3\,\ell\,\big(0.6 + 0.4\sin \pi x\big)\,\max(0, \sin 2\pi\,25T)^2\;\LP_{280}\,\eta`],
    musicbox: [R`y = \Rev\Big[\Dly\Big[0.16\sum_j \ell\,e^{-3t_j}\big(\sin 2\pi f_jt_j + 0.25e^{-6t_j}\sin 2\pi\,4.2f_jt_j\big)\Big]\Big]`],
    meow: [R`y = \Rev\Big[\Dly\Big[1.4\,a(u)\,\LP_{M(u)}\sum_{i=1}^{3}\frac{g_i}{Q_i}\BP_{F_i(u)}\big(\saw(f) + 0.25\eta\,(1 - \sin\pi u)\big)\Big]\Big]`, ...MEOW],
    tomcat: [R`y = \Rev\Big[1.6\,a(u)\,\LP_{M(u)}\sum_i\frac{g_i}{Q_i}\BP_{0.8F_i(u)}\tanh\!\big(2.5\,\saw(f/2)\big)\Big]`, ...MEOW],
    mrrp: [R`y = \Rev\Big[a(u)\,\big(\tfrac12 + \tfrac12\cos 2\pi\,28T\big)\big(0.2\,\BP_{1300}\saw(f) + 0.35\,\LP_{2200}\saw(f)\big)\Big]`, R`f = 698.46\cdot 2^{(-5 + 12\sqrt u)/12}`],
    bass: [R`y = 0.5\,e^{-2.5\tau}\Big(\sin 2\pi\!\int\! f + 0.3\tanh\!\big(2\,\LP_{600+1500e^{-8\tau}}\saw(f)\big)\Big),\qquad f = 87.31\cdot 2^{(b_k + v)/12}`],
    paw: [R`y = 0.75\,e^{-7\tau}\sin 2\pi\!\int\!\big(50 + 120e^{-30\tau}\big)dT + 0.15\,e^{-40\tau}\,\LP_{900}\,\eta`],
    hiss: [R`y = 0.5\Big((1 - e^{-60\tau})\,e^{-5\tau}\,\BP_{4500}\,\eta + 0.5\,e^{-80\tau}\,\HP_{2000}\,\eta\Big)`],
    claws: [R`y = 0.35\,a\,e^{-90\tau}\,\HP_{9000}\,\eta,\qquad \tau = x \bmod \tfrac12`],
    sample_a: SAMPLE, sample_b: SAMPLE,
  },

  lofi: {
    ambience: [R`y = a\Big(0.06\,\HP_{400}\LP_{6000}\,\eta + 0.12\sum_{d}a_d\,e^{-60t_d}\sin 2\pi f_d(1 + 2t_d)\,t_d\Big) + 0.01\,\LP_{5000}\,\eta + \text{треск}`, R`\text{капли: } f_d \in [1500, 4000]\ \text{Гц в случайные моменты}`],
    rhodes: [R`y = \Rev\,\Tape\,\Cho\Big[\LP\big((1 \mp 0.25\sin 2\pi\,3.5T)\;0.13\sum_{\text{ноты}} E(f, t, v)\big)\Big]`, RHODES],
    piano: [R`y = \Rev\,\Tape\Big[0.3\,\LP\sum_{\text{ноты}} P(f, t, v)\Big]`, ...PIANO],
    bass: [R`y = 0.3\tanh\!\Big(1.2\,\LP_{1800}\sum U(f, t, v)\Big)`, UPRIGHT],
    drums: [R`y = \Rev\,\Tape\Big[\LP_{6000}\big(0.8K + 0.4S + 0.1H + 0.08O + 0.25\,\text{Rim}\big)\Big]`, R`K = e^{-7\tau}\tanh\!\big(2\sin 2\pi\!\int(45 + 110e^{-40\tau})\big),\quad S = 0.6e^{-14t}\HP_{900}\eta + 0.4e^{-28t}\sin 2\pi\,180t`, R`H = e^{-70t}\,\HP_{7000}\big(0.7\,\BP\,\textstyle\sum_{i=1}^{6}\sq(F_i)/6 + 0.3\eta\big),\quad F = (205, 304, 370, 523, 540, 800)`],
    flute: [R`y = \Rev\big[\Dly[0.32\,Fl]\big]`, ...FLUTE],
    vibes: [R`y = \Rev\Big[0.22\big(1 - 0.4(\tfrac12 + \tfrac12\sin 2\pi\,5T)\big)\sum V(f, t, v)\Big]`, VIBES, R`\text{соло: случайное блуждание по фа мажору; полиритм — нота каждые } 1.5 \text{ доли}`],
    strings: [R`y = \Rev\big[\Cho[\,0.07\,S\,]\big]`, STRINGS],
    cat: [R`y = \Rev\Big[\Dly\Big[0.45\,\LP_{4500}\,\LP_{M(u)}\sum_i\frac{g_i}{Q_i}\BP_{0.95F_i(u)}\saw(f)\Big]\Big]`, ...MEOW],
  },

  bossa: {
    guitar: [R`y = \Rev\,\Cho\Big[0.55\big(0.6\,\LP_{5000}\,s + 0.5\,\BP_{105}\,s + 0.35\,\BP_{210}\,s + 0.2\,\BP_{420}\,s\big)\Big]`, R`s:\ y_i \leftarrow 0.997\,\big(0.5\,y_i + 0.5\,y_{i+1}\big),\quad N = 44100/f\quad\text{(нейлон, Карплус — Стронг)}`],
    bass: [R`y = 0.2\,\LP_{1500}\sum U(f, t, v)`, UPRIGHT],
    drums: [R`y = \Rev\big[0.55K + 0.18\,\text{Rim} + 0.12S + 0.1\,\text{Sh} + 0.07\,\text{Ride} + 0.05\,|\sin\pi x|^2\,\LP\,\BP_{3500}\,\eta\big]`, R`K = e^{-5\tau}\tanh\sin 2\pi\!\int(50 + 70e^{-25\tau}),\quad \text{Rim} = e^{-60t}(0.6\sin 2\pi\,1700t + 0.4\sin 2\pi\,560t) + e^{-120t}\BP_{2500}\eta`, R`\text{Sh} = (1 - e^{-400t})\,e^{-35t}\,\BP_{6500}\,\eta`],
    vibes: [R`y = \Rev\Big[0.2\big(1 - 0.35(\tfrac12 + \tfrac12\sin 2\pi\,5.5T)\big)\sum V(f, t, v)\Big]`, VIBES],
    flute: [R`y = \Rev\big[\Dly[0.3\,Fl]\big]`, ...FLUTE],
    piano: [R`y = \Rev\Big[0.28\sum_{\text{ноты}} P(f, t, v)\Big]`, ...PIANO],
    scat: [R`y = \Rev\Big[\Dly\Big[0.75\,a\sum_{i=1}^{3}\frac{g_i}{Q_i}\BP_{1.08F_i}\big(\saw(f) + 0.08\eta\big)\Big]\Big]`, R`f = 523.25\cdot 2^{(n + s + v)/12},\quad s = -\max(0, 1 - t/0.08),\quad v = 0.25\min(1, t/0.5)\sin 2\pi\,5.5T`, R`F:\ \text{«у», «а», «а», «и», «а», «о»} \dots\ \text{(ду-ба-да)}`],
    strings: [R`y = \Rev\big[\Cho[\,0.06\,S\,]\big]`, STRINGS],
  },

  chiptune: {
    lead: [R`y = 0.34\,\vol\!\big(1 - 0.3\min(1, t/0.3)\big)\,\Pi_d\big(523.25\cdot 2^{(n + v)/12}\big),\qquad d \in \{\tfrac18, \tfrac14, \tfrac12\}`, R`v = 0.3\sin 2\pi\,6T\ \ (t > 0.35),\qquad \text{в пещере} + \Dly`, CHIP],
    harmony: [R`y = 0.3\,\vol\!\big(0.15 + 0.55e^{-4(x \bmod 1/2)}\big)\,\Pi_{1/8}\big(261.63\cdot 2^{c_i/12}\big),\qquad i = \lfloor 60T\rfloor \bmod 3`, CHIP],
    bass: [R`y = 0.2\,\frac{\lfloor 8\,\tri(\varphi)\rfloor}{8},\qquad \varphi = \!\int 65.41\cdot 2^{n/12}\,dT`],
    drums: [R`y = 0.3\Big(\tri_4\big(60 + 300e^{-30t}\big) + 0.3e^{-80t}\lfsr\Big) + 0.14\,\vol(e^{-12t})\lfsr_{12\text{k}} + 0.07\,\vol(e^{-50t})\lfsr^{\text{metal}}_{30\text{k}}`, R`\lfsr:\ s \leftarrow (s \gg 1) \,|\, \big((s_0 \oplus s_1) \ll 14\big)`],
    sfx: [R`y = \Rev\Big[0.1\,\vol(a)\,\Pi_{1/2}\big(f(t)\big) + 0.3e^{-2t}\lfsr\big(8000\cdot 2^{-5t}\big)\Big]`, R`f_{\text{coin}} = 987.77 \to 1318.5,\quad f_{\text{down}} = 900\cdot 2^{-2t},\quad f_{\text{jump}} = 300\cdot 2^{4t}`],
  },

  voidchip: {
    lead: [R`y = \Rev\Big[\Dly\Big[0.3\,\vol\!\big(1 - 0.35\min(1, t/0.4)\big)\,\LP_{9000}\,\Pi_d\big(587.33\cdot 2^{(n + v)/12}\big)\Big]\Big]`, R`v = 0.25\sin 2\pi\,5.5T,\qquad d = \tfrac14\ \ (\tfrac18\ \text{в тёмных секциях})`, CHIP],
    organ: [R`y = \Rev\Big[g\Big(0.33\,\LP_{6000}\,\Pi_{1/4}\big(f_{c_i + 12}\big) + 0.27\,\LP_{2500}\,\tfrac13\sum_{j}\Pi_{1/2}\big(f_{c_j}\big)\Big) + 0.4\,\vol(0.8)\,\Pi_{1/8}\big(f_{\text{канон}}\big)\Big]`, R`i = \lfloor 60T\rfloor \bmod 3,\qquad f_c = 293.66\cdot 2^{c/12}`, R`\text{канон: } n(x) = L(x - 2) + 7\ \text{(обратная сторона)},\quad L(x - 1) - 12\ \text{(орбита II)}`],
    bass: [R`y = 0.16\,\frac{\lfloor 8\,\tri(\varphi)\rfloor}{8},\qquad \varphi = \!\int 73.42\cdot 2^{n/12}\,dT`],
    drums: [R`y = \Rev\Big[0.32\big(\tri_4(55 + 280e^{-28t}) + 0.3e^{-80t}\lfsr\big) + 0.14\,\vol(e^{-10t})\,\lfsr_{10\text{k}} + 0.06\,\vol(e^{-50t})\,\lfsr^{\text{metal}}_{30\text{k}}\Big]`],
    bells: [R`y = \Rev\Big[0.5\sum_{h} v_h\,e^{-1.6t_h}\sin\!\big(2\pi f_h t_h + 3e^{-4t_h}\sin 2\pi\,3.5f_h t_h\big)\Big]`, R`\text{удары: смена аккорда; в затмении — каждые } 1.5 \text{ доли}`],
    choir: [R`y = \Rev\big[\Cho[\,0.35\,S\,]\big],\qquad f_j = 587.33\cdot 2^{c_{k,j}/12}`, STRINGS],
    stars: [R`y = \Dly\Big[0.7\,\vol\big(e^{-9t}\big)\,\Pi_{1/8}\big(1174.66\cdot 2^{n/12}\big)\Big],\qquad \text{удары в } x \in \tfrac34\mathbb{Z} \cup \mathbb{Z}\ \ (4:3)`],
    space: [R`y = \Rev\Big[0.04\,\BP_{400\cdot 2^{2\sin(2\pi x/32)}}\lfsr_{20\text{k}} + 0.02\sin 2\pi\!\int 110\cdot 2^{\tau/4}\,dT\Big]`],
  },
}
