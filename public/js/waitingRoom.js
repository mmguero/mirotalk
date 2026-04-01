'use strict';

const pathParts = window.location.pathname.split('/');
const roomId = pathParts[pathParts.length - 1];
const statusEl = document.getElementById('waitingStatus');
const loginLink = document.getElementById('loginLink');
const waitingRoomNameEl = document.getElementById('waitingRoomName');
const waitingRoomNameText = document.getElementById('waitingRoomNameText');
const waitingElapsedText = document.getElementById('waitingElapsedText');
const pollInterval = 5000;

// Store the room in the session for auto-join from the landing page after successful login
window.sessionStorage.roomID = roomId;

let intervalId = null;
let roomActive = false;
const waitStartTime = Date.now();
let elapsedTimerId = null;

if (roomId && roomId !== 'join') {
    waitingRoomNameText.textContent = roomId;
    waitingRoomNameEl.style.display = '';
}

function updateElapsedTime() {
    const seconds = Math.floor((Date.now() - waitStartTime) / 1000);
    if (seconds < 60) {
        waitingElapsedText.textContent = getWaitingRoomBrand('waitingRoomElapsedJust', 'Just started waiting');
    } else {
        const minutes = Math.floor(seconds / 60);
        const template = getWaitingRoomBrand('waitingRoomElapsedMinutes', 'Waiting for {minutes}');
        waitingElapsedText.textContent = template.replace(
            '{minutes}',
            minutes + (minutes === 1 ? ' minute' : ' minutes')
        );
    }
}
elapsedTimerId = setInterval(updateElapsedTime, 10000);

// Brand text (overridden by Brand.js if configured)
function getWaitingRoomBrand(key, fallback) {
    try {
        return (typeof brand !== 'undefined' && brand?.site?.[key]) || fallback;
    } catch (e) {
        return fallback;
    }
}

// Set login link with room param so host returns to the room after login
if (roomId && roomId !== 'join') {
    loginLink.href = '/login?room=' + encodeURIComponent(roomId);
}

function flashCheckingState() {
    statusEl.textContent = getWaitingRoomBrand('waitingRoomStatus', 'Checking room status...');
    statusEl.classList.remove('ready');
    statusEl.classList.add('checking');
    setTimeout(() => statusEl.classList.remove('checking'), 600);
}

function checkRoom() {
    flashCheckingState();

    if (!roomId || roomId === 'join') return;

    axios
        .post('/isRoomActive', { roomId: roomId })
        .then(function (response) {
            if (response.data && response.data.message === true) {
                roomActive = true;
                if (waitingAudio) {
                    waitingAudio.pause();
                    waitingAudio = null;
                }
                statusEl.textContent = getWaitingRoomBrand('waitingRoomReady', 'Room is ready! Joining...');
                statusEl.classList.add('ready');
                setTimeout(function () {
                    window.location.href = '/join/' + encodeURIComponent(roomId);
                }, 800);
            } else {
                statusEl.textContent = getWaitingRoomBrand(
                    'waitingRoomWaiting',
                    'Waiting for host to start the meeting...'
                );
                scheduleCheck();
            }
        })
        .catch(function () {
            statusEl.textContent = getWaitingRoomBrand(
                'waitingRoomWaiting',
                'Waiting for host to start the meeting...'
            );
            scheduleCheck();
        });
}

function scheduleCheck() {
    if (document.hidden) {
        document.addEventListener('visibilitychange', function onVisible() {
            if (!document.hidden) {
                document.removeEventListener('visibilitychange', onVisible);
                checkRoom();
            }
        });
    } else {
        setTimeout(checkRoom, pollInterval);
    }
}

checkRoom();

// Waiting room audio player
const audioPlayerEl = document.getElementById('waitingAudioPlayer');
const audioBtn = document.getElementById('waitingAudioBtn');
const audioIcon = document.getElementById('waitingAudioIcon');
const audioMuteBtn = document.getElementById('waitingAudioMute');
const audioMuteIcon = document.getElementById('waitingAudioMuteIcon');
const audioProgress = document.getElementById('waitingAudioProgress');

let waitingAudio = null;
let audioPlaying = false;

function initAudioPlayer() {
    const songUrl = getWaitingRoomBrand('waitingRoomSongUrl', '');
    if (!songUrl) return;

    audioPlayerEl.style.display = '';

    waitingAudio = new Audio(songUrl);
    waitingAudio.loop = true;
    waitingAudio.volume = 0.5;

    waitingAudio.addEventListener('timeupdate', function () {
        if (waitingAudio && waitingAudio.duration) {
            const pct = (waitingAudio.currentTime / waitingAudio.duration) * 100;
            audioProgress.style.width = pct + '%';
        }
    });

    audioBtn.onclick = function () {
        if (audioPlaying) {
            waitingAudio.pause();
            audioIcon.className = 'fa-solid fa-play';
            audioBtn.title = 'Play music';
        } else {
            waitingAudio.play().catch(function () {});
            audioIcon.className = 'fa-solid fa-pause';
            audioBtn.title = 'Pause music';
        }
        audioPlaying = !audioPlaying;
    };

    audioMuteBtn.onclick = function () {
        waitingAudio.muted = !waitingAudio.muted;
        audioMuteIcon.className = waitingAudio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        audioMuteBtn.title = waitingAudio.muted ? 'Unmute' : 'Mute';
    };
}

// Initialize audio player after brand is loaded
setTimeout(initAudioPlayer, 1000);
