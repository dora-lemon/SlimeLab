// Web Audio API 音效服务
// 使用合成器生成音效，无需外部音频文件

export type SoundType =
  | 'jump'           // 跳跃 - 上升音调
  | 'launch'         // 发射粒子 - 根据蓄力变化
  | 'bounce'         // 落地/碰撞 - 柔和的噗声
  | 'reabsorb'       // 重新吸收 - 吸入声
  | 'chargeStart';   // 开始蓄力 - 音调爬升

class AudioService {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;

  // 音效开关
  private enabled: boolean = true;

  // 蓄力音效状态
  private chargingOscillator: OscillatorNode | null = null;
  private chargingGain: GainNode | null = null;

  constructor() {
    // 延迟初始化 AudioContext（需要用户交互）
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass();

      // 创建主音量控制
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.3; // 主音量 30%
      this.masterGain.connect(this.context.destination);

      this.isInitialized = true;
    }

    // 恢复 AudioContext（如果被暂停）
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    return this.context;
  }

  // 启用/禁用音效
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        enabled ? 0.3 : 0,
        this.context?.currentTime || 0,
        0.1
      );
    }
  }

  // 播放音效的主方法
  play(type: SoundType, param?: number): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      switch (type) {
        case 'jump':
          this.playJumpSound(now);
          break;
        case 'launch':
          this.playLaunchSound(now, param || 0.5);
          break;
        case 'bounce':
          this.playBounceSound(now, param || 1);
          break;
        case 'reabsorb':
          this.playReabsorbSound(now);
          break;
        case 'chargeStart':
          this.startChargingSound(now);
          break;
      }
    } catch (e) {
      // 静默失败，避免控制台错误
      console.debug('Audio error:', e);
    }
  }

  // 停止蓄力音效
  stopCharging(): void {
    if (this.chargingOscillator && this.chargingGain && this.context) {
      const now = this.context.currentTime;
      this.chargingGain.gain.setTargetAtTime(0, now, 0.05);

      // 停止主振荡器
      this.chargingOscillator.stop(now + 0.1);

      // 停止 LFO（如果存在）
      const lfo = (this.chargingGain as any).lfo;
      const lfo2 = (this.chargingGain as any).lfo2;
      if (lfo) lfo.stop(now + 0.1);
      if (lfo2) lfo2.stop(now + 0.1);

      this.chargingOscillator = null;
      this.chargingGain = null;
    }
  }

  // 跳跃音效 - 快速上升的正弦波
  private playJumpSound(now: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.1);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.setTargetAtTime(0, now + 0.05, 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 发射音效 - 根据 chargeLevel (0-1) 调整音调和音量
  private playLaunchSound(now: number, chargeLevel: number): void {
    if (!this.context || !this.masterGain) return;

    // 停止蓄力音效
    this.stopCharging();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    // 音调从低到高根据蓄力程度
    const baseFreq = 150 + chargeLevel * 300;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.15);

    // 音量也根据蓄力
    const volume = 0.3 + chargeLevel * 0.4;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setTargetAtTime(0, now + 0.05, 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 碰撞/落地音效 - 柔和的低频噗声
  private playBounceSound(now: number, intensity: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    // 根据强度调整音量
    const volume = Math.min(0.3 * intensity, 0.5);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setTargetAtTime(0, now + 0.02, 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 重新吸收音效 - 吸入效果（频率上升）
  private playReabsorbSound(now: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    // 使用低通滤波器创造柔和效果
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(800, now + 0.1);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setTargetAtTime(0, now + 0.05, 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 开始蓄力音效 - 史莱姆特色的弹性咕叽声
  private startChargingSound(now: number): void {
    if (!this.context || !this.masterGain) return;
    this.stopCharging(); // 停止之前的

    // 主振荡器 - 三角波带点谐波
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    // 低通滤波器 - 创造柔软、闷闷的史莱姆感
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2; // 轻微共振
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.linearRampToValueAtTime(400, now + 1.0);

    // LFO 调制 - 创造弹性颤动效果
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 6; // 6Hz 的弹性颤动
    lfoGain.gain.value = 30; // 调制深度

    // 第二个 LFO 调制滤波器 - 创造咕叽咕叽的效果
    const lfo2 = this.context.createOscillator();
    const lfo2Gain = this.context.createGain();
    lfo2.type = 'triangle';
    lfo2.frequency.value = 4; // 4Hz 较慢的波动
    lfo2Gain.gain.value = 80;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(180, now + 1.0);

    // 音量包络
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.3);

    // 连接节点
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(filter.frequency);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    lfo.start(now);
    lfo2.start(now);

    // 保存引用以便停止
    this.chargingOscillator = osc;
    this.chargingGain = gain;

    (gain as any).lfo = lfo;
    (gain as any).lfo2 = lfo2;
  }

  // 清理资源
  dispose(): void {
    this.stopCharging();
    if (this.context) {
      this.context.close();
      this.context = null;
      this.masterGain = null;
      this.isInitialized = false;
    }
  }
}

// 单例导出
export const audioService = new AudioService();
