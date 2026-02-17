const { createApp, ref, onMounted, nextTick, computed } = Vue;

// ========================================== 
// BACKEND SIMULATION (For Local Testing)
// ========================================== 
if (typeof google === 'undefined') {
  console.log("%c[SIMULATION MODE] GAS Backend not found. Mocking API calls.", "color: #00f3ff; font-weight: bold;");
  
  var google = {
    script: {
      run: {
        withSuccessHandler: function(callback) {
          return {
            withFailureHandler: function(errCallback) {
              return {
                verifyGeminiConnection: () => {
                  setTimeout(() => callback("Connection Verified"), 1500);
                },
                getAgentState: () => {
                  // Simulate random activity
                  setTimeout(() => {
                    const states = ["THINKING", "EXECUTING", "VALIDATING", "IDLE"];
                    const teams = ["RESEARCH TEAM", "CONTENT TEAM", "OPS TEAM", "SEO TEAM"];
                    const rnd = Math.random();
                    const state = {
                      timestamp: new Date().getTime(),
                      team: rnd > 0.7 ? teams[Math.floor(Math.random() * teams.length)] : "IDLE",
                      agent: rnd > 0.7 ? "SIMULATED_BUILDER" : "---",
                      status: rnd > 0.7 ? states[Math.floor(Math.random() * 3)] : "STANDBY",
                      details: rnd > 0.7 ? "Simulating neural processing..." : "System ready."
                    };
                    callback(state);
                  }, 200);
                },
                handleRequest: (text, img) => {
                  setTimeout(() => {
                    callback({
                      text: "SIMULATION OUTPUT: I received your command: '" + text + "'.\n\nSince this is running locally without the Google Apps Script backend, I cannot actually access your Drive or Gmail. \n\nHowever, the UI and logic flow are fully functional."
                    });
                  }, 3000);
                }
              }
            }
          }
        }
      }
    }
  };
}

// ========================================== 
// VUE APP LOGIC
// ========================================== 
createApp({
  setup() {
    const booting = ref(true);
    const bootProgress = ref(0);
    const bootStatus = ref("Readying BIOS...");
    
    const userInput = ref("");
    const chatHistory = ref([]);
    const isProcessing = ref(false);
    const isConnected = ref(false);
    const currentTime = ref("");
    
    const activeState = ref({ team: null, agent: null, status: null, details: null });
    const eventLogs = ref([]);
    const progressWidth = ref(0);
    
    const chatBox = ref(null);
    const logBox = ref(null);
    const fileInput = ref(null);
    const selectedImage = ref(null);
    
    let pollInterval = null;

    const uiColor = computed(() => isProcessing.value ? '#ffaa00' : '#00f3ff');

    // CANVAS ANIMATION
    const initCanvas = () => {
      const canvas = document.getElementById('neural-canvas');
      if(!canvas) return; 
      const ctx = canvas.getContext('2d');
      let w, h, pts = [];

      const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        pts = Array.from({ length: 50 }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vX: (Math.random()-0.5)*0.4, vY: (Math.random()-0.5)*0.4
        }));
      };
      
      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = uiColor.value;
        ctx.strokeStyle = uiColor.value + '22';
        pts.forEach((p, i) => {
          p.x += p.vX; p.y += p.vY;
          if(p.x<0||p.x>w) p.vX*=-1; if(p.y<0||p.y>h) p.vY*=-1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, Math.PI*2); ctx.fill();
          pts.slice(i+1).forEach(p2 => {
            const d = Math.hypot(p.x-p2.x, p.y-p2.y);
            if(d<180) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
          });
        });
        requestAnimationFrame(draw);
      };
      window.addEventListener('resize', resize); resize(); draw();
    };

    const runBoot = () => {
      const logs = ["Kernel Check", "Memory Map", "Net established", "Agent Handshake"];
      let i = 0;
      const interval = setInterval(() => {
        bootProgress.value += 20;
        bootStatus.value = logs[i++] || "Operational";
        if(bootProgress.value >= 100) {
          clearInterval(interval);
          setTimeout(() => { booting.value = false; nextTick(initCanvas); }, 600);
        }
      }, 350);
    };

    setInterval(() => currentTime.value = new Date().toLocaleTimeString(), 1000);

    const addLog = (source, message, type = 'info') => {
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      eventLogs.value.push({ time, source, message, type });
      nextTick(() => { if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight; });
    };

    const getLogColor = (t) => t === 'error' ? '#ef4444' : (t === 'success' ? '#22c55e' : (t === 'tool' ? '#ffaa00' : '#00f3ff'));

    const handleFileSelect = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = (ev) => selectedImage.value = { name: f.name, mimeType: f.type, data: ev.target.result.split(',')[1] };
      r.readAsDataURL(f);
    };
    const clearImage = () => { selectedImage.value = null; if(fileInput.value) fileInput.value.value = ""; };

    const sendMessage = () => {
      if (!userInput.value.trim() && !selectedImage.value) return;
      const text = userInput.value; const img = selectedImage.value;
      chatHistory.value.push({ role: 'user', text: text + (img ? " [ATTACHED]" : "") });
      userInput.value = ""; clearImage(); isProcessing.value = true; progressWidth.value = 15;
      
      startPolling();

      google.script.run.withSuccessHandler((res) => {
        isProcessing.value = false; chatHistory.value.push({ role: 'model', text: res.text || "COMPLETE." });
        stopPolling(); progressWidth.value = 100;
        activeState.value = { team: "IDLE", agent: "---", status: "STBY", details: "Neural link stable." };
        nextTick(() => { if(chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight; });
      }).withFailureHandler((err) => {
        isProcessing.value = false; stopPolling(); addLog('ERR', err.message, 'error');
      }).handleRequest(text, img);
    };

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        google.script.run.withSuccessHandler((s) => {
          if (s && s.timestamp !== activeState.value.timestamp) {
            activeState.value = s;
            addLog(s.agent || 'CORE', s.details || s.status, s.status === 'EXECUTING' ? 'tool' : 'info');
            if (progressWidth.value < 90) progressWidth.value += 8;
          }
        }).getAgentState();
      }, 1200);
    };
    const stopPolling = () => clearInterval(pollInterval);

    onMounted(() => {
      runBoot();
      google.script.run.withSuccessHandler(() => { isConnected.value = true; addLog('NET', 'Secure uplink.', 'success'); }).verifyGeminiConnection();
    });

    return {
      booting, bootProgress, bootStatus, userInput, chatHistory, isProcessing, isConnected, currentTime,
      activeState, eventLogs, progressWidth, chatBox, logBox, fileInput, selectedImage,
      sendMessage, handleFileSelect, clearImage, getLogColor, uiColor
    };
  }
}).mount('#app');
