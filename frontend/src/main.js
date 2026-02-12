(function() {
      'use strict';

      const RAW_API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim();
      const API_BASE_URL = RAW_API_BASE_URL || window.location.origin;

      function resolveAppToken() {
        const url = new URL(window.location.href);
        const tokenFromQuery = url.searchParams.get('token');
        if (tokenFromQuery && tokenFromQuery.trim()) {
          localStorage.setItem('app_access_token', tokenFromQuery.trim());
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.toString());
          return tokenFromQuery.trim();
        }
        return (localStorage.getItem('app_access_token') || '').trim();
      }

      const APP_ACCESS_TOKEN = resolveAppToken();

      function buildApiHeaders(initialHeaders) {
        const headers = new Headers(initialHeaders || {});
        if (APP_ACCESS_TOKEN) {
          headers.set('X-APP-TOKEN', APP_ACCESS_TOKEN);
        }
        return headers;
      }

      function apiFetch(url, options) {
        const safeOptions = options || {};
        return fetch(url, {
          ...safeOptions,
          headers: buildApiHeaders(safeOptions.headers)
        });
      }

      // Fallback questions if backend is unavailable
      const FALLBACK_QUESTIONS = [
        'Tell me about yourself and your background.',
        'What motivated you to pursue a career in technology?',
        'What specific technical skills or technologies are you most passionate about?',
        'Describe a project where you had to overcome a significant technical challenge.',
        'What do you enjoy most about working in a team environment?',
        'Where do you see yourself in five years? What role are you aiming for?',
        'What is your preferred work style - independent contributor or collaborative team player?',
        'Tell me about a time when you received feedback that improved your work.',
        'What habits or routines help you maintain productivity and work-life balance?',
        'If you could master any new technology instantly, what would it be and why?'
      ];

      // DOM Elements
      const containers = {
        recordButton: document.getElementById('record-button'),
        visualizerCanvas: document.getElementById('audio-visualizer'),
        statusDot: document.querySelector('.status-dot'),
        statusText: document.querySelector('.status-text'),
        playerContainer: document.getElementById('player-container'),
        playButton: document.getElementById('play-button'),
        resetButton: document.getElementById('reset-button'),
        questionContainer: document.getElementById('question-container'),
        recordedQuestionContainer: document.getElementById('recorded-question-container'),
        responseContainer: document.getElementById('response-container'),
        progressFill: document.getElementById('progress-fill'),
        timeDisplay: document.getElementById('time-display')
      };

      const backendLink = document.getElementById('backend-link');
      if (backendLink) {
        backendLink.href = API_BASE_URL;
        backendLink.textContent = API_BASE_URL.replace(/^https?:\/\//, '');
      }

      let currentAudio = null;
      let mediaRecorder = null;
      let mediaStream = null;
      let audioChunks = [];
      let isRecording = false;
      let visualizerFrame = null;
      let audioContext = null;
      let analyser = null;
      let micSource = null;
      let isSpaceHoldRecording = false;

      // Initialize app
      function init() {
        console.log('Initializing AI Interview Representative...');
        drawIdleVisualizer();
        window.addEventListener('resize', drawIdleVisualizer);
        loadQuestions();
        setupEventListeners();
      }

      // Load questions from backend or use fallback
      async function loadQuestions() {
        try {
          const response = await apiFetch(`${API_BASE_URL}/api/v1/interview/questions`);
          if (!response.ok) throw new Error('Failed to load questions');
          const data = await response.json();
          const questions = data.questions || FALLBACK_QUESTIONS;
          renderQuestions(questions);
        } catch (error) {
          console.warn('Using fallback questions:', error);
          renderQuestions(FALLBACK_QUESTIONS);
        }
      }

      // Render questions list
      function renderQuestions(questions) {
        if (!containers.questionContainer) return;
        containers.questionContainer.className = 'question-content';
        containers.questionContainer.innerHTML = questions.map(q => `
          <div class="question-item" data-question="${escapeHtml(q)}" role="button" tabindex="0">
            <div class="question-text">${escapeHtml(q)}</div>
          </div>
        `).join('');

        // Add click handlers
        containers.questionContainer.querySelectorAll('.question-item').forEach(item => {
          item.addEventListener('click', () => {
            const question = item.getAttribute('data-question');
            handleQuestionSelect(question, item);
          });
          item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const question = item.getAttribute('data-question');
              handleQuestionSelect(question, item);
            }
          });
        });
      }

      // Handle question selection
      async function handleQuestionSelect(question, itemElement) {
        // Mark as selected
        itemElement.classList.add('selected');

        // Update status
        updateStatus('processing', 'Processing...');

        try {
          const response = await apiFetch(`${API_BASE_URL}/api/v1/interview/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
          });
          const data = await response.json();

          if (data.error) {
            updateStatus('error', data.error);
            itemElement.classList.remove('selected');
            return;
          }

          // Display response
          if (containers.responseContainer) {
            containers.responseContainer.className = 'panel-content';
            containers.responseContainer.textContent = data.response || 'No response';
          }

          // Load audio if available
          if (data.audioData) {
            loadAudio(data.audioData, data.audioFormat);
          }

          updateStatus('playing', 'Response ready');

        } catch (error) {
          console.error('Error sending question:', error);
          updateStatus('error', 'Error: ' + error.message);
          itemElement.classList.remove('selected');
        }
      }

      // Update status display
      function updateStatus(state, message) {
        if (containers.statusDot) {
          containers.statusDot.className = `status-dot ${state}`;
        }
        if (containers.statusText) {
          containers.statusText.textContent = message;
        }
      }

      function setRecordButtonState(state) {
        if (!containers.recordButton) return;
        containers.recordButton.classList.remove('recording', 'processing');
        if (state === 'recording' || state === 'processing') {
          containers.recordButton.classList.add(state);
        }
      }

      function getVisualizerContext() {
        if (!containers.visualizerCanvas) return null;
        const canvas = containers.visualizerCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { canvas, ctx, width: rect.width, height: rect.height };
      }

      function drawIdleVisualizer() {
        const visualizer = getVisualizerContext();
        if (!visualizer) return;

        const { ctx, width, height } = visualizer;
        ctx.clearRect(0, 0, width, height);

        const midY = height / 2;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(167, 139, 250, 0.15)');
        gradient.addColorStop(0.5, 'rgba(45, 212, 191, 0.22)');
        gradient.addColorStop(1, 'rgba(167, 139, 250, 0.15)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
      }

      function stopVisualizer() {
        if (visualizerFrame !== null) {
          cancelAnimationFrame(visualizerFrame);
          visualizerFrame = null;
        }
      }

      async function cleanupMicAnalyzer() {
        stopVisualizer();

        if (micSource) {
          try {
            micSource.disconnect();
          } catch (error) {
            console.error('Error disconnecting microphone source:', error);
          }
          micSource = null;
        }

        if (analyser) {
          try {
            analyser.disconnect();
          } catch (error) {
            console.error('Error disconnecting analyzer:', error);
          }
          analyser = null;
        }

        if (audioContext) {
          try {
            await audioContext.close();
          } catch (error) {
            console.error('Error closing audio context:', error);
          }
          audioContext = null;
        }

        drawIdleVisualizer();
      }

      async function startMicVisualizer(stream) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;

        await cleanupMicAnalyzer();

        audioContext = new AudioContextCtor();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        micSource = audioContext.createMediaStreamSource(stream);
        micSource.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const render = () => {
          const visualizer = getVisualizerContext();
          if (!visualizer || !analyser) return;

          const { ctx, width, height } = visualizer;
          analyser.getByteFrequencyData(data);

          ctx.clearRect(0, 0, width, height);

          const barCount = 48;
          const barWidth = Math.max(2, width / (barCount * 1.6));
          const gap = barWidth * 0.6;
          const totalWidth = barCount * barWidth + (barCount - 1) * gap;
          const startX = (width - totalWidth) / 2;
          const midY = height / 2;

          for (let i = 0; i < barCount; i++) {
            const index = Math.floor((i / barCount) * data.length);
            const normalized = data[index] / 255;
            const minHeight = 4;
            const amplitude = normalized * (height * 0.45);
            const h = minHeight + amplitude;
            const x = startX + i * (barWidth + gap);
            const y = midY - h / 2;

            const alpha = 0.25 + normalized * 0.75;
            ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
            ctx.fillRect(x, y, barWidth, h);
          }

          visualizerFrame = requestAnimationFrame(render);
        };

        render();
      }

      async function startRecording() {
        if (isRecording) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          updateStatus('error', 'Microphone is not supported in this browser');
          return;
        }

        // If AI response audio is playing, stop it before recording.
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          if (containers.playButton) {
            containers.playButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
          }
        }

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          await startMicVisualizer(mediaStream);
          mediaRecorder = new MediaRecorder(mediaStream);
          audioChunks = [];

          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
              audioChunks.push(event.data);
            }
          });

          mediaRecorder.addEventListener('stop', async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            await sendRecordedAudio(audioBlob);
          });

          mediaRecorder.start();
          isRecording = true;
          setRecordButtonState('recording');
          updateStatus('recording', 'Recording...');
        } catch (error) {
          console.error('Error starting recording:', error);
          updateStatus('error', 'Unable to access microphone');
          setRecordButtonState('idle');
        }
      }

      function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        setRecordButtonState('processing');
        updateStatus('processing', 'Processing...');
        cleanupMicAnalyzer();

        try {
          mediaRecorder.stop();
        } catch (error) {
          console.error('Error stopping recorder:', error);
          updateStatus('error', 'Failed to stop recording');
          setRecordButtonState('idle');
        }

        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }
      }

      function cancelRecording() {
        if (!mediaRecorder) return;
        isRecording = false;
        audioChunks = [];
        cleanupMicAnalyzer();

        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = null;
        try {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        } catch (error) {
          console.error('Error cancelling recorder:', error);
        }

        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }

        mediaRecorder = null;
        setRecordButtonState('idle');
      }

      async function sendRecordedAudio(audioBlob) {
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await apiFetch(`${API_BASE_URL}/api/v1/interview/speak`, {
            method: 'POST',
            body: formData
          });
          const data = await response.json();

          if (!response.ok || data.error) {
            throw new Error(data.error || `Request failed (${response.status})`);
          }

          if (containers.responseContainer) {
            containers.responseContainer.className = 'panel-content';
            containers.responseContainer.textContent = data.response || 'No response';
          }
          if (containers.recordedQuestionContainer) {
            containers.recordedQuestionContainer.className = 'mic-question-box';
            containers.recordedQuestionContainer.textContent = data.transcription || 'No transcription captured.';
          }

          if (data.audioData) {
            loadAudio(data.audioData, data.audioFormat);
          }

          updateStatus('playing', 'Response ready');
        } catch (error) {
          console.error('Error sending recorded audio:', error);
          updateStatus('error', 'Failed to process audio');
        } finally {
          setRecordButtonState('idle');
          mediaRecorder = null;
        }
      }

      // Load and play audio
      function loadAudio(base64Audio, format) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }

        try {
          const audioBytes = atob(base64Audio);
          const arrayBuffer = new ArrayBuffer(audioBytes.length);
          const view = new Uint8Array(arrayBuffer);
          for (let i = 0; i < audioBytes.length; i++) {
            view[i] = audioBytes.charCodeAt(i);
          }
          const audioBlob = new Blob([arrayBuffer], { type: format || 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);

          currentAudio = new Audio(audioUrl);
          currentAudio.addEventListener('ended', () => {
            updateStatus('idle', 'Ready');
            if (containers.playButton) {
              containers.playButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }
          });

          currentAudio.addEventListener('timeupdate', () => {
            if (containers.progressFill && currentAudio.duration) {
              const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
              containers.progressFill.style.width = progress + '%';
            }
            if (containers.timeDisplay && currentAudio.duration) {
              const current = formatTime(currentAudio.currentTime);
              const total = formatTime(currentAudio.duration);
              containers.timeDisplay.textContent = `${current} / ${total}`;
            }
          });

          // Show player and auto-play
          if (containers.playerContainer) {
            containers.playerContainer.classList.add('active');
          }
          currentAudio.play().catch(console.error);

          if (containers.playButton) {
            containers.playButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
          }

        } catch (error) {
          console.error('Error loading audio:', error);
        }
      }

      // Format time as M:SS
      function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + secs.toString().padStart(2, '0');
      }

      // Escape HTML to prevent XSS
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Setup event listeners
      function setupEventListeners() {
        if (containers.recordButton) {
          containers.recordButton.addEventListener('click', () => {
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          });
        }

        // Reset button
        if (containers.resetButton) {
          containers.resetButton.addEventListener('click', handleReset);
        }

        // Play/Pause button
        if (containers.playButton) {
          containers.playButton.addEventListener('click', togglePlayback);
        }

        // Hold SPACE to record; releasing SPACE sends the question.
        window.addEventListener('keydown', (event) => {
          if (event.code !== 'Space') return;
          const target = event.target;
          const tagName = target && target.tagName ? target.tagName.toLowerCase() : '';
          const isEditable = target && (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            target.isContentEditable
          );
          if (isEditable || event.repeat) return;

          event.preventDefault();
          if (!isRecording) {
            isSpaceHoldRecording = true;
            startRecording();
          }
        });

        window.addEventListener('keyup', (event) => {
          if (event.code !== 'Space') return;
          if (!isSpaceHoldRecording) return;

          event.preventDefault();
          isSpaceHoldRecording = false;
          if (isRecording) {
            stopRecording();
          }
        });

        window.addEventListener('blur', () => {
          if (isSpaceHoldRecording) {
            isSpaceHoldRecording = false;
            if (isRecording) {
              stopRecording();
            }
          }
        });
      }

      // Handle reset
      async function handleReset() {
        try {
          await apiFetch(`${API_BASE_URL}/api/v1/interview/reset`, { method: 'POST' });

          // Clear displays
          if (containers.questionContainer) {
            containers.questionContainer.innerHTML = '<span class="question-picker-loading">Loading interview questions...</span>';
            containers.questionContainer.className = 'question-content empty';
            loadQuestions();
          }
          if (containers.responseContainer) {
            containers.responseContainer.innerHTML = 'Your answer will appear here…';
            containers.responseContainer.className = 'panel-content empty';
          }
          if (containers.recordedQuestionContainer) {
            containers.recordedQuestionContainer.innerHTML = 'Your recorded question will appear here...';
            containers.recordedQuestionContainer.className = 'mic-question-box empty';
          }
          if (containers.playerContainer) {
            containers.playerContainer.classList.remove('active');
          }
          if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
          }
          if (isRecording) {
            cancelRecording();
          }
          updateStatus('idle', 'Conversation reset');
        } catch (error) {
          console.error('Error resetting:', error);
        }
      }

      // Toggle playback
      function togglePlayback() {
        if (!currentAudio) return;
        if (currentAudio.paused) {
          currentAudio.play();
          if (containers.playButton) {
            containers.playButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
          }
        } else {
          currentAudio.pause();
          if (containers.playButton) {
            containers.playButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
          }
        }
      }

      // Start app
      init();
    })();
