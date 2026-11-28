import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Clock,
  Shield,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Appointment, UserSession } from '../types';
import { DoctorAvatar } from './DoctorAvatar';

interface VideoCallModalProps {
  user: UserSession;
  appointment: Appointment;
  isInitiator: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onRegisterSignalHandler: (handler: ((event: any) => void) | null) => void;
  onOpenChat: () => void;
  onClose: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  user,
  appointment,
  isInitiator,
  wsRef,
  onRegisterSignalHandler,
  onOpenChat,
  onClose,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasSentOfferRef = useRef<boolean>(false);

  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState<boolean>(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState<boolean>(true);
  const [remoteJoined, setRemoteJoined] = useState<boolean>(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState<boolean>(false);
  const [callState, setCallState] = useState<
    'initializing' | 'ringing' | 'connecting' | 'connected' | 'declined' | 'ended'
  >('initializing');
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const isDoctorUser = user.role === 'DOCTOR';
  const counterpartyName = isDoctorUser ? appointment.patientName : appointment.doctorName;

  useEffect(() => {
    if (callState !== 'connected') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    let isCancelled = false;

    const flushPendingCandidates = async (pc: RTCPeerConnection) => {
      if (!pc.remoteDescription) return;
      const queued = [...pendingCandidatesRef.current];
      pendingCandidatesRef.current = [];
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignore stale ICE candidates
        }
      }
    };

    const sendWs = (payload: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    };

    const startPeerOffer = async (pc: RTCPeerConnection) => {
      if (hasSentOfferRef.current) return;
      hasSentOfferRef.current = true;
      setCallState('connecting');
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        sendWs({
          type: 'video:signal',
          appointmentId: appointment.id,
          senderId: user.id,
          senderRole: user.role,
          signalType: 'offer',
          sdp: offer,
        });
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
        hasSentOfferRef.current = false;
      }
    };

    const handleSignalEvent = async (event: any) => {
      if (isCancelled || !event || Number(event.appointmentId) !== appointment.id) return;
      const pc = peerConnRef.current;

      if (event.type === 'video:accepted') {
        setCallState((prev) => (prev === 'connected' ? prev : 'connecting'));
        return;
      }

      if (event.type === 'video:declined') {
        setCallState('declined');
        setMediaNotice(`${counterpartyName} declined the video call.`);
        return;
      }

      if (event.type === 'video:ended') {
        setRemoteJoined(false);
        setRemoteHasVideo(false);
        setCallState('ended');
        setMediaNotice(`${counterpartyName} left the video consultation.`);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        return;
      }

      if (event.type === 'video:media-state') {
        if (Number(event.userId) !== user.id) {
          setRemoteAudioEnabled(Boolean(event.audioEnabled));
          setRemoteVideoEnabled(Boolean(event.videoEnabled));
        }
        return;
      }

      if (event.type === 'video:peers') {
        const peers = Array.isArray(event.peers) ? event.peers : [];
        const otherPeers = peers.filter((p: any) => Number(p.userId) !== user.id);
        setRemoteJoined(otherPeers.length > 0);
        if (otherPeers.length > 0 && pc) {
          // Deterministic initiator: DOCTOR creates offer, or lower userId if same role
          const other = otherPeers[0];
          const shouldOffer =
            user.role === 'DOCTOR' ||
            (other.role !== 'DOCTOR' && user.id < Number(other.userId));
          if (shouldOffer) {
            await startPeerOffer(pc);
          } else {
            setCallState((prev) => (prev === 'connected' ? prev : 'connecting'));
          }
        }
        return;
      }

      if (event.type === 'video:signal' && pc) {
        try {
          if (event.signalType === 'offer' && event.sdp) {
            setCallState('connecting');
            await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));
            await flushPendingCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWs({
              type: 'video:signal',
              appointmentId: appointment.id,
              senderId: user.id,
              senderRole: user.role,
              signalType: 'answer',
              sdp: answer,
            });
          } else if (event.signalType === 'answer' && event.sdp) {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));
              await flushPendingCandidates(pc);
            }
          } else if (event.signalType === 'ice-candidate' && event.candidate) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(event.candidate));
            } else {
              pendingCandidatesRef.current.push(event.candidate);
            }
          }
        } catch (err) {
          console.error('WebRTC signaling error:', err);
        }
      }
    };

    onRegisterSignalHandler(handleSignalEvent);

    const setupMediaAndPeer = async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setVideoEnabled(false);
          setMediaNotice('Camera was not detected or permission was denied. Joined in audio-only mode.');
        } catch {
          setAudioEnabled(false);
          setVideoEnabled(false);
          setMediaNotice(
            'Camera and microphone access was unavailable. You can still view the remote participant and use live chat.'
          );
        }
      }

      if (isCancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnRef.current = pc;

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream!);
        });
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setRemoteHasVideo(event.streams[0].getVideoTracks().length > 0);
        } else {
          remoteStream.addTrack(event.track);
          if (event.track.kind === 'video') {
            setRemoteHasVideo(true);
          }
        }
        setRemoteJoined(true);
        setCallState('connected');
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setCallState('ended');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWs({
            type: 'video:signal',
            appointmentId: appointment.id,
            senderId: user.id,
            senderRole: user.role,
            signalType: 'ice-candidate',
            candidate: event.candidate,
          });
        }
      };

      setCallState(isInitiator ? 'ringing' : 'connecting');

      sendWs({
        type: 'video:join',
        appointmentId: appointment.id,
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
      });

      if (isInitiator) {
        sendWs({
          type: 'video:invite',
          appointmentId: appointment.id,
          callerId: user.id,
          callerName: user.fullName,
          callerRole: user.role,
          appointment,
        });
      }
    };

    setupMediaAndPeer();

    return () => {
      isCancelled = true;
      onRegisterSignalHandler(null);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'video:leave',
            appointmentId: appointment.id,
          })
        );
      }
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnRef.current?.close();
      peerConnRef.current = null;
    };
  }, [appointment.id]);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'video:media-state',
          appointmentId: appointment.id,
          userId: user.id,
          audioEnabled: next,
          videoEnabled,
        })
      );
    }
  };

  const toggleVideo = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'video:media-state',
          appointmentId: appointment.id,
          userId: user.id,
          audioEnabled,
          videoEnabled: next,
        })
      );
    }
  };

  const handleHangUp = () => {
    onClose();
  };

  const statusText =
    callState === 'connected'
      ? 'Connected'
      : callState === 'connecting'
      ? 'Connecting video...'
      : callState === 'ringing'
      ? `Calling ${counterpartyName}...`
      : callState === 'declined'
      ? 'Call declined'
      : callState === 'ended'
      ? 'Call ended'
      : 'Starting camera...';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Top Call Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <DoctorAvatar
              doctorId={appointment.doctorId}
              name={counterpartyName}
              sizeClass="w-10 h-10"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Video Consultation with {counterpartyName}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      callState === 'connected'
                        ? 'bg-emerald-500'
                        : callState === 'declined' || callState === 'ended'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  {statusText}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate mt-0.5">
                {appointment.specialization} · Visit {appointment.date}
                {appointment.medicalReportUrl ? ` · Attached: ${appointment.medicalReportUrl}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg tabular-nums">
              <Clock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              {formatDuration(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={onOpenChat}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Live Chat
            </button>
          </div>
        </div>

        {/* Media Notice */}
        {mediaNotice && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mediaNotice}</span>
          </div>
        )}

        {/* Video Stage */}
        <div className="relative bg-slate-950 aspect-video max-h-[62vh] w-full flex items-center justify-center overflow-hidden">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${
              remoteJoined && remoteHasVideo && remoteVideoEnabled ? 'block' : 'hidden'
            }`}
          />

          {/* Remote Placeholder when waiting or camera off */}
          {(!remoteJoined || !remoteHasVideo || !remoteVideoEnabled) && (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
              <DoctorAvatar
                doctorId={appointment.doctorId}
                name={counterpartyName}
                sizeClass="w-20 h-20"
              />
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">{counterpartyName}</p>
                <p className="text-xs text-slate-400">
                  {callState === 'declined'
                    ? 'The call was declined.'
                    : callState === 'ended'
                    ? 'The video call has ended.'
                    : remoteJoined && !remoteVideoEnabled
                    ? 'Camera turned off'
                    : isInitiator
                    ? `Waiting for ${counterpartyName} to join the video room...`
                    : 'Connecting to remote media stream...'}
                </p>
              </div>
            </div>
          )}

          {/* Remote Mute Badge */}
          {remoteJoined && !remoteAudioEnabled && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-slate-200 inline-flex items-center gap-1.5">
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
              {counterpartyName} muted
            </div>
          )}

          {/* Local PiP Preview */}
          <div className="absolute bottom-4 right-4 w-40 sm:w-52 aspect-video bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover -scale-x-100 ${
                videoEnabled && localStreamRef.current?.getVideoTracks().length ? 'block' : 'hidden'
              }`}
            />
            {(!videoEnabled || !localStreamRef.current?.getVideoTracks().length) && (
              <div className="flex flex-col items-center gap-1 text-slate-400 text-xs">
                <VideoOff className="w-5 h-5" />
                <span>You ({user.role === 'DOCTOR' ? 'Doctor' : 'Patient'})</span>
              </div>
            )}
            <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white bg-slate-950/70 px-1.5 py-0.5 rounded">
              You {!audioEnabled ? '(Muted)' : ''}
            </span>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Shield className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
            Encrypted peer-to-peer WebRTC video consultation
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAudio}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                audioEnabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {audioEnabled ? 'Mute' : 'Unmute'}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                videoEnabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              {videoEnabled ? 'Camera Off' : 'Camera On'}
            </button>

            <button
              type="button"
              onClick={handleHangUp}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
