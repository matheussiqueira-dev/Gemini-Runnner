import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useStore } from '../../store';
import { GameStatus } from '../../types';

const JUMP_THRESHOLD = 0.24;
const JUMP_COOLDOWN_MS = 450;
const WASM_FILES_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm';
const HAND_MODEL_PATH = '/models/hand_landmarker.task';

const resolveCameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Permissao de camera negada. Habilite para usar controle por maos.';
    }

    if (error.name === 'NotFoundError') {
      return 'Nenhuma camera foi encontrada neste dispositivo.';
    }

    if (error.name === 'NotReadableError') {
      return 'A camera esta em uso por outro app. Feche-o e tente novamente.';
    }

    if (error.name === 'OverconstrainedError') {
      return 'Nao foi possivel aplicar as configuracoes da camera.';
    }

    if (error.name === 'SecurityError') {
      return 'Controle por camera requer HTTPS ou localhost.';
    }
  }

  return 'Nao foi possivel ativar a camera. Tente novamente.';
};

export const WebcamController: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef(-1);
  const lastJumpTriggerRef = useRef(0);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const status = useStore((state) => state.status);
  const laneCount = useStore((state) => state.laneCount);
  const setTargetLane = useStore((state) => state.setTargetLane);
  const triggerJump = useStore((state) => state.triggerJump);

  const isGameActive = status === GameStatus.PLAYING;

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_FILES_URL);

        const createWithDelegate = (delegate: 'GPU' | 'CPU') =>
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: HAND_MODEL_PATH,
              delegate,
            },
            runningMode: 'VIDEO',
            numHands: 1,
          });

        let handLandmarker: HandLandmarker;
        try {
          handLandmarker = await createWithDelegate('GPU');
        } catch (gpuError) {
          console.warn('GPU delegate unavailable, falling back to CPU:', gpuError);
          handLandmarker = await createWithDelegate('CPU');
        }

        if (!active) {
          handLandmarker.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;
        setIsLoaded(true);
        setCameraError(null);
      } catch (error) {
        console.error('Failed to initialize hand tracking:', error);
        setCameraError(
          'Nao foi possivel iniciar o rastreamento de maos. Verifique conexao e suporte do navegador.',
        );
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, []);

  const stopStream = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.srcObject = null;
    }

    setPermissionGranted(false);
  };

  const mapFingerToLane = (fingerX: number) => {
    const maxLane = Math.floor(laneCount / 2);
    const normalized = (fingerX - 0.5) * 2;
    return Math.max(-maxLane, Math.min(maxLane, Math.round(normalized * maxLane)));
  };

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number }[],
    width: number,
    height: number,
  ) => {
    const links = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20],
      [5, 9],
      [9, 13],
      [13, 17],
    ];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#3df9ff';

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(50, 211, 255, 0.4)';
    ctx.beginPath();

    links.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (!p1 || !p2) {
        return;
      }
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
    });

    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#b8ffff';
    ctx.stroke();

    landmarks.forEach((landmark, index) => {
      const isTip = [4, 8, 12, 16, 20].includes(index);
      const radius = isTip ? 5 : 3.5;

      ctx.beginPath();
      ctx.fillStyle = isTip ? '#ff71ca' : '#5ef1ff';
      ctx.arc(landmark.x * width, landmark.y * height, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const predict = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker) {
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const nowInMs = Date.now();
      const results = handLandmarker.detectForVideo(video, nowInMs);

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks?.length) {
          const hand = results.landmarks[0] as { x: number; y: number }[];
          const indexTip = hand[8];
          if (!indexTip) {
            requestRef.current = requestAnimationFrame(predict);
            return;
          }

          drawSkeleton(ctx, hand, canvas.width, canvas.height);

          const fingerX = indexTip.x;
          const fingerY = indexTip.y;

          setTargetLane(mapFingerToLane(fingerX));

          const now = Date.now();
          if (fingerY < JUMP_THRESHOLD && now - lastJumpTriggerRef.current > JUMP_COOLDOWN_MS) {
            triggerJump();
            lastJumpTriggerRef.current = now;
          }
        }
      }
    }

    requestRef.current = requestAnimationFrame(predict);
  };

  const enableCam = async () => {
    if (!handLandmarkerRef.current) {
      setCameraError('Rastreamento de maos ainda nao foi inicializado.');
      return;
    }

    if (!window.isSecureContext) {
      setCameraError('Controle por camera requer HTTPS ou localhost.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Seu navegador nao suporta acesso a camera.');
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (playError) {
            console.warn('Video autoplay fallback failed:', playError);
          }

          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
          }
          lastVideoTimeRef.current = -1;
          requestRef.current = requestAnimationFrame(predict);
        };
      }

      setPermissionGranted(true);
    } catch (error) {
      console.error('Camera permission denied:', error);
      setCameraError(resolveCameraErrorMessage(error));
    }
  };

  useEffect(() => {
    if (isGameActive && isLoaded && !permissionGranted) {
      enableCam();
    }

    if (!isGameActive && permissionGranted) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      stopStream();
    }
  }, [isGameActive, isLoaded, permissionGranted]);

  useEffect(() => {
    return () => {
      stopStream();

      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="cam-overlay"
      style={{
        opacity: isGameActive ? 1 : 0,
        pointerEvents: isGameActive ? 'auto' : 'none',
      }}
    >
      {isInitializing && isGameActive && <p className="cam-error">Inicializando camera...</p>}

      {!permissionGranted && isGameActive && isLoaded && (
        <button type="button" onClick={enableCam} className="btn btn-secondary cam-button">
          <Camera size={16} /> Ativar controle por maos
        </button>
      )}

      {cameraError && isGameActive && <p className="cam-error">{cameraError}</p>}

      {permissionGranted && (
        <div className="cam-shell" aria-label="Preview do controle por camera">
          <video ref={videoRef} autoPlay playsInline muted className="webcam-mirror" />
          <canvas ref={canvasRef} className="webcam-mirror" />

          <div className="cam-guides" aria-hidden="true">
            <div className="cam-jump-line" />
            <div className="cam-hint cam-hint-top">LEVANTE A MAO PARA PULAR</div>
            <div className="cam-hint cam-hint-bottom">MOVA PARA ESQUERDA / DIREITA</div>
          </div>

          <span className="cam-status" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
