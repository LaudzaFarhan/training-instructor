import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BookOpen, Home, CheckCircle, Lock, Send, RotateCcw } from "lucide-react";
import { pb, useAppState } from "../../context/AppStateContext";

// --- Script Loading Utility ---
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", reject);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// --- Toolbox XML ---
const TOOLBOX_XML = `
<xml id="toolbox" style="display: none">
    <category name="Logic" colour="#5b80a5">
        <block type="controls_if"></block>
        <block type="controls_if">
            <mutation else="1"></mutation>
        </block>
        <block type="controls_if">
            <mutation elseif="1" else="1"></mutation>
        </block>
        <block type="logic_compare"><field name="OP">EQ</field></block>
        <block type="logic_compare"><field name="OP">NEQ</field></block>
        <block type="logic_compare"><field name="OP">LT</field></block>
        <block type="logic_compare"><field name="OP">LTE</field></block>
        <block type="logic_compare"><field name="OP">GT</field></block>
        <block type="logic_compare"><field name="OP">GTE</field></block>
        <block type="logic_operation"><field name="OP">AND</field></block>
        <block type="logic_operation"><field name="OP">OR</field></block>
        <block type="logic_negate"></block>
        <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
        <block type="logic_boolean"><field name="BOOL">FALSE</field></block>
        <block type="logic_null"></block>
    </category>
    <category name="Loops" colour="#5ba55b">
        <block type="controls_repeat_ext">
            <value name="TIMES">
                <shadow type="math_number"><field name="NUM">10</field></shadow>
            </value>
        </block>
        <block type="forever_loop"></block>
        <block type="controls_whileUntil"><field name="MODE">WHILE</field></block>
        <block type="controls_for">
            <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
            <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
            <value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="controls_flow_statements"></block>
    </category>
    <category name="Math" colour="#5b67a5">
        <block type="math_number"><field name="NUM">1</field></block>
        <block type="math_arithmetic"><field name="OP">ADD</field></block>
        <block type="math_random_int">
             <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
             <value name="TO"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
        </block>
    </category>
    <category name="Text" colour="#5ba58c">
        <block type="text"></block>
        <block type="text_print"></block>
        <block type="text_join"></block>
    </category>
    <category name="Lists" colour="#745ba5">
        <block type="lists_create_with">
            <mutation items="0"></mutation>
        </block>
        <block type="lists_create_with"></block>
        <block type="lists_length"></block>
        <block type="lists_isEmpty"></block>
        <block type="lists_indexOf"></block>
        <block type="lists_getIndex"></block>
        <block type="lists_setIndex"></block>
    </category>
    <category name="Comments" colour="#5ba58c">
        <block type="line_comment"></block>
    </category>
    <category name="Variables" colour="#a55b80" custom="VARIABLE"></category>
    <category name="Functions" colour="#995ba5" custom="PROCEDURE"></category>
    <category name="Wait / Time" colour="#a5a55b">
        <block type="wait_seconds">
            <value name="SECONDS"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="timer_value"></block>
        <block type="timer_reset"></block>
    </category>
    <category name="Motor" colour="#4a90e2">
        <block type="motor_control">
            <value name="LEFT_SPEED"><shadow type="math_number"><field name="NUM">75</field></shadow></value>
            <value name="RIGHT_SPEED"><shadow type="math_number"><field name="NUM">75</field></shadow></value>
            <value name="SECONDS_INPUT"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="stop_moving"></block>
    </category>
    <category name="LCD" colour="#999999">
        <block type="lcd_display">
            <value name="TEXT"><shadow type="text"><field name="TEXT">Hello</field></shadow></value>
            <value name="ROW"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
            <value name="COL"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="clear_screen"></block>
    </category>
    <category name="Buzzer" colour="#5ba55b">
        <block type="play_note_simple">
             <value name="SECOND"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="play_tone_simple">
             <value name="TONE"><shadow type="math_number"><field name="NUM">440</field></shadow></value>
             <value name="SECOND"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="play_note_volume">
             <value name="VOLUME"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
             <value name="SECOND"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="play_tone_volume">
             <value name="TONE"><shadow type="math_number"><field name="NUM">440</field></shadow></value>
             <value name="VOLUME"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
             <value name="SECOND"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="stop_buzzer"></block>
    </category>
    <category name="Color Sensor" colour="#e6a300">
        <block type="color_name"></block>
        <block type="wait_until_color"><field name="COLOR">'red'</field></block>
        <block type="color_dropdown"><field name="COLOR">'red'</field></block>
    </category>
    <category name="Button Sensor" colour="#4a90e2">
        <block type="return_button_value">
            <field name="BUTTON">D18</field>
        </block>
        <block type="wait_until_button">
            <field name="BUTTON">D18</field>
            <field name="STATE">PRESSED</field>
        </block>
    </category>
    <category name="Ultrasonic Sensor" colour="#995ba5">
        <block type="get_ultrasonic_distance"><field name="PORT">D26</field></block>
        <block type="wait_until_distance">
            <field name="PORT">D26</field>
            <value name="DISTANCE"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
        </block>
    </category>
    <category name="Gyro Sensor" colour="#a55b80">
        <block type="get_gyro_angle"><field name="AXIS">Z</field></block>
    </category>
</xml>
`;

// --- Icons ---
const ConeIcon = ({ className }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path d="M20 90 H80 L85 95 H15 L20 90 Z" fill="#FF6B00" />
    <path d="M25 90 L50 10 L75 90 H25 Z" fill="#FF8533" />
    <path d="M38 50 H62 L59 40 H41 L38 50 Z" fill="white" />
    <path d="M33 70 H67 L64 60 H36 L33 70 Z" fill="white" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M3 6h18" stroke="#86EFAC" strokeWidth="3" />
    <path
      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke="#86EFAC"
      fill="#86EFAC"
      fillOpacity="0.2"
    />
    <line x1="10" y1="11" x2="10" y2="17" stroke="#86EFAC" />
    <line x1="14" y1="11" x2="14" y2="17" stroke="#86EFAC" />
  </svg>
);

// --- Main Component ---
const BlocklyRobotSimulator = ({ challenges = [], levelId, levelName }) => {
  const { currentUser } = useAppState();
  const [isBlocklyLoaded, setIsBlocklyLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(challenges.length > 0 ? "task" : "robot");
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [zoom, setZoom] = useState(1.2); // Zoom state
  const zoomRef = useRef(1.2); // Ref to access zoom inside loops without dependency issues
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [revisionChallenges, setRevisionChallenges] = useState([]);
  const [revisionData, setRevisionData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const [previewSnippet, setPreviewSnippet] = useState(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  // Check for preview mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('previewMode') === 'true') {
      const snippetData = sessionStorage.getItem('previewSnippet');
      if (snippetData) {
        const snippet = JSON.parse(snippetData);
        setPreviewSnippet(snippet);
        // Set the generated code from the snippet
        if (snippet.code) {
          setGeneratedCode(snippet.code);
        }
      }
    }
  }, []);

  // Navigate to specific challenge by title from URL param (works for both preview and resubmit)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeTitle = params.get('challengeTitle');
    if (challengeTitle && challenges.length > 0) {
      const decodedTitle = decodeURIComponent(challengeTitle);
      const matchIndex = challenges.findIndex(
        c => c.challengeName === decodedTitle
      );
      if (matchIndex >= 0) {
        setCurrentChallengeIndex(matchIndex);
      }
    }
  }, [challenges]);

  // Load completed challenges from PocketBase
  useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser?.id || !levelId) return;
      try {
        const progressRecords = await pb.collection('teacher_blockly_progress').getFullList({
            filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
        });
        if (progressRecords.length > 0) {
          setCompletedChallenges(progressRecords[0].completedChallenges || []);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };
    loadProgress();
  }, [currentUser, levelId]);

  // Load revision status from challenge acknowledgements
  useEffect(() => {
    const loadRevisionStatus = async () => {
      if (!currentUser?.username || challenges.length === 0) return;
      try {
        const username = currentUser.username.toLowerCase();
        const revisionIds = [];
        const newRevisionData = {};
        // Check each challenge that has a unitId (step-based)
        for (const ch of challenges) {
          const baseChallengeId = ch.id.includes('_step_') ? ch.id.split('_step_')[0] : ch.id;
          try {
            const challengeRecord = await pb.collection('challenges').getOne(baseChallengeId, { requestKey: null });
            const acks = challengeRecord.acknowledgements || {};
            // Check all keys that belong to this user
            for (const [key, ack] of Object.entries(acks)) {
              const ackUsername = ack.username || (key.includes('--') ? key.split('--')[0] : key);
              if (ackUsername === username && ack.status === 'needs_revision') {
                // Match the step index if applicable
                if (ch.id.includes('_step_')) {
                  const stepIdx = ch.id.split('_step_')[1];
                  if (key === `${username}--${stepIdx}`) {
                    revisionIds.push(ch.id);
                    if (ack.blocklyXml) newRevisionData[ch.id] = ack.blocklyXml;
                  }
                } else if (key === username) {
                  revisionIds.push(ch.id);
                  if (ack.blocklyXml) newRevisionData[ch.id] = ack.blocklyXml;
                }
              }
            }
          } catch (e) { /* challenge may not exist */ }
        }
        setRevisionChallenges(revisionIds);
        setRevisionData(newRevisionData);
      } catch (err) {
        console.error('Error loading revision status:', err);
      }
    };
    loadRevisionStatus();
  }, [currentUser, challenges]);

  const injectedRevisions = useRef(new Set());

  // Inject instructor's previous code whenever they navigate to a challenge needing revision
  useEffect(() => {
    if (!workspaceReady || !workspaceRef.current || challenges.length === 0) return;
    const challenge = challenges[currentChallengeIndex];
    if (!challenge) return;

    if (revisionChallenges.includes(challenge.id) && revisionData[challenge.id]) {
        if (!injectedRevisions.current.has(challenge.id)) {
            try {
                workspaceRef.current.clear();
                const Blockly = window.Blockly;
                const xmlUtils = Blockly.utils?.xml || Blockly.Xml;
                const xml = xmlUtils.textToDom(revisionData[challenge.id]);
                if (Blockly.Xml && Blockly.Xml.domToWorkspace) {
                    Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
                } else if (Blockly.serialization && Blockly.serialization.workspaces) {
                    Blockly.serialization.workspaces.load(
                        JSON.parse(revisionData[challenge.id]),
                        workspaceRef.current
                    );
                }
                injectedRevisions.current.add(challenge.id);
            } catch (e) {
                console.error("Failed to load revision XML", e);
            }
        }
    }
  }, [currentChallengeIndex, revisionChallenges, revisionData, challenges, workspaceReady]);

  // Check if a challenge is unlocked
  const isChallengeUnlocked = (index) => {
    if (currentUser?.role === 'admin') return true;
    if (index === 0) return true;
    return completedChallenges.includes(challenges[index - 1]?.id);
  };

  // Submit challenge
  const handleSubmitChallenge = async () => {
    if (!currentUser || submitting) return;
    
    const challenge = challenges[currentChallengeIndex];
    if (!challenge) return;

    setSubmitting(true);
    try {
      // Get Blockly XML (graphical representation)
      let blocklyXml = '';
      if (window.Blockly && workspaceRef.current) {
        const xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
        blocklyXml = window.Blockly.Xml.domToText(xml);
      }

      // Save to snippets with both code and Blockly XML
      // In PocketBase, we use the \`submissions\` collection and query by username if needed.
      const timestamp = new Date().toISOString();
      const submissionId = `${levelId}_${challenge.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Try to find existing submission
      let existingSubmission = null;
      try {
        const records = await pb.collection('submissions').getFullList({
           filter: `customId="${submissionId}" && username="${currentUser.username.toLowerCase()}"`
        });
        if (records.length > 0) {
           existingSubmission = records[0];
        }
      } catch(e) {}

      const subData = {
        customId: submissionId,
        username: currentUser.username.toLowerCase(),
        code: generatedCode,
        blocklyXml: blocklyXml,
        title: challenge.challengeName,
        description: (challenge.description || '').substring(0, 4999),
        levelName: levelName || 'Unknown',
        unitName: challenge.unitName || '',
        timestamp: timestamp,
        type: 'blockly'
      };

      if (existingSubmission) {
         await pb.collection('submissions').update(existingSubmission.id, subData);
      } else {
         await pb.collection('submissions').create(subData);
      }

      // Create pending review for admin
      if (challenge.unitId) {
        // For step-based challenges, extract the base challenge ID
        const baseChallengeId = challenge.id.includes('_step_') 
          ? challenge.id.split('_step_')[0] 
          : challenge.id;
        
        try {
            console.log('DEBUG: Fetching challenge record:', baseChallengeId);
            const challengeRecord = await pb.collection('challenges').getOne(baseChallengeId);
            const acknowledgements = challengeRecord.acknowledgements || {};
            
            // Use step-specific key for step-based challenges
            const ackKey = challenge.id.includes('_step_')
              ? `${currentUser.username.toLowerCase()}--${challenge.id.split('_step_')[1]}`
              : currentUser.username.toLowerCase();

            acknowledgements[ackKey] = {
                status: 'pending',
                username: currentUser.username.toLowerCase(),
                submittedAt: timestamp,
                code: (generatedCode || '').substring(0, 2000),
                blocklyXml: blocklyXml || '',
                questionTitle: challenge.challengeName,
                questionInstructions: (challenge.description || '').substring(0, 500),
                type: 'blockly'
            };
            
            console.log('DEBUG: Updating acknowledgements with key:', ackKey, 'data size:', JSON.stringify(acknowledgements).length);
            await pb.collection('challenges').update(baseChallengeId, { acknowledgements });
            console.log('DEBUG: Acknowledgement update SUCCESS');
        } catch(e) {
            console.error('Challenge acknowledgement update failed:', baseChallengeId, e, e?.data);
            alert('DEBUG: Ack update FAILED: ' + (e?.message || e) + '\nDetails: ' + JSON.stringify(e?.data || {}));
        }
      } else {
        console.warn('Challenge missing unitId, cannot create pending review');
        alert('DEBUG: challenge.unitId is missing! challenge.id=' + challenge.id);
      }

      // Mark as completed locally
      const newCompleted = [...completedChallenges];
      if (!newCompleted.includes(challenge.id)) {
        newCompleted.push(challenge.id);
        setCompletedChallenges(newCompleted);

        // Save progress
        if (currentUser.id) {
           try {
               const progRecords = await pb.collection('teacher_blockly_progress').getFullList({
                   filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
               });
               if (progRecords.length > 0) {
                   await pb.collection('teacher_blockly_progress').update(progRecords[0].id, {
                       completedChallenges: newCompleted,
                       lastUpdated: timestamp
                   });
               } else {
                   await pb.collection('teacher_blockly_progress').create({
                       teacherId: currentUser.id,
                       levelId: levelId,
                       completedChallenges: newCompleted,
                       lastUpdated: timestamp
                   });
               }
           } catch(e) {
               console.error("Error saving progress", e);
           }
        }
      }

      // Auto-advance to next challenge
      if (currentChallengeIndex < challenges.length - 1) {
        setTimeout(() => {
          // Clear the Blockly workspace for the next challenge
          if (window.Blockly && workspaceRef.current) {
            workspaceRef.current.clear();
          }
          setGeneratedCode('');
          setCurrentChallengeIndex(currentChallengeIndex + 1);
        }, 1000);
      }

      alert('Challenge submitted successfully! Waiting for admin review.');
    } catch (error) {
      console.error('Error submitting challenge:', error, error?.data);
      alert('Failed to submit: ' + (error?.message || 'Unknown error') + '\nDetails: ' + JSON.stringify(error?.data || {}));
    } finally {
      setSubmitting(false);
    }
  };

  // Reset progress for current user (admin only)
  const handleResetProgress = async () => {
    if (currentUser?.role !== 'admin') return;
    
    if (!window.confirm(`Reset ALL Blockly progress for this level?\n\nThis will:\n• Clear completed challenges\n• Remove acknowledgements\n• Delete submissions\n\nThis cannot be undone!`)) {
      return;
    }

    setResettingProgress(true);
    try {
      // 1. Clear local blockly progress
      const progressRecords = await pb.collection('teacher_blockly_progress').getFullList({
          filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
      });
      for (const record of progressRecords) {
          await pb.collection('teacher_blockly_progress').delete(record.id);
      }

      // 2. Clear acknowledgements from challenges for this user
      // Assuming flat collections: first find all units for this level
      const unitsData = await pb.collection('units_new').getFullList({ filter: `levelId="${levelId}"` });
      for (const unit of unitsData) {
          const challengesList = await pb.collection('challenges').getFullList({ filter: `unitId="${unit.id}"` });
          for (const chal of challengesList) {
             const acks = chal.acknowledgements || {};
             const comments = chal.submissionComments || {};
             
             const userAckKeys = Object.keys(acks).filter(key => {
                 const keyUsername = key.includes('--') ? key.split('--')[0] : key;
                 return keyUsername.toLowerCase() === currentUser.username.toLowerCase();
             });

             if (userAckKeys.length > 0) {
                const newAcks = { ...acks };
                const newComments = { ...comments };
                userAckKeys.forEach(key => {
                    delete newAcks[key];
                    delete newComments[key];
                });
                await pb.collection('challenges').update(chal.id, {
                    acknowledgements: newAcks,
                    submissionComments: newComments
                });
             }
          }
      }

      // 3. Delete submissions
      const submissions = await pb.collection('submissions').getFullList({
          filter: `username="${currentUser.username.toLowerCase()}" && levelName="${levelName}" && type="blockly"`
      });
      for (const sub of submissions) {
          await pb.collection('submissions').delete(sub.id);
      }

      // Clear local state
      setCompletedChallenges([]);
      setCurrentChallengeIndex(0);
      
      alert('Progress reset successfully!');
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('Failed to reset progress. Please try again.');
    } finally {
      setResettingProgress(false);
    }
  };

  // Automatically switch to "task" tab when challenges are loaded
  useEffect(() => {
    if (challenges.length > 0) {
      setActiveTab("task");
    }
  }, [challenges]);

  // Refs
  const blocklyDivRef = useRef(null);
  const simulationAreaRef = useRef(null);
  const robotRef = useRef(null);
  const trashRef = useRef(null);
  const colorPatchContainerRef = useRef(null);
  const ultraValueRef = useRef(null);
  const lSpeedValueRef = useRef(null);
  const rSpeedValueRef = useRef(null);

  // Simulation State Refs
  const workspaceRef = useRef(null);
  const robotState = useRef({
    x: 0,
    y: 0,
    angle: 0,
    leftSpeed: 0,
    rightSpeed: 0,
  });
  const lastTimeRef = useRef(Date.now()); // Track time for physics loop

  // Cones: Using Refs for physics loop, State for rendering list
  const [cones, setCones] = useState([{ id: 1 }]);
  const conesDataRef = useRef([{ id: 1, x: 300, y: 150 }]);
  const coneDomRefs = useRef({});

  const animationFrameId = useRef(null);
  const detectedColorRef = useRef("none"); // For physics loop
  const [uiSelectedColor, setUiSelectedColor] = useState("none"); // For UI

  const audioCtx = useRef(null);
  const activeOscillators = useRef([]);
  const timerStart = useRef(0);
  const buttonStates = useRef({ D18: false, D22: false, D24: false });
  const isRunning = useRef(false); // Tracks if simulation is active
  const lcdCells = useRef([]);

  // --- Helper Functions ---
  const logToConsole = useCallback((msg) => {
    setConsoleOutput((prev) => prev + `> ${msg}\n`);
  }, []);

  const updateRobotPosition = useCallback(() => {
    if (robotRef.current) {
      robotRef.current.style.left = `${robotState.current.x}px`;
      robotRef.current.style.top = `${robotState.current.y}px`;
      robotRef.current.style.transform = `rotate(${robotState.current.angle + 90
        }deg)`;
    }
  }, []);



  // Directly update DOM for performance during loop
  const updateConesPosition = useCallback(() => {
    conesDataRef.current.forEach((cone) => {
      const el = coneDomRefs.current[cone.id];
      if (el) {
        el.style.left = `${cone.x}px`;
        el.style.top = `${cone.y}px`;
      }
    });
  }, []);

  // Update zoom ref when state changes
  useEffect(() => {
    zoomRef.current = zoom;
    // Force a position update to handle any immediate layout shifts
    updateConesPosition();
    updateRobotPosition();
  }, [zoom, updateRobotPosition, updateConesPosition]);

  const lcdClear = useCallback(() => {
    lcdCells.current.forEach((cell) => {
      if (cell) cell.textContent = "\u00A0"; // Non-breaking space
    });
  }, []);

  const resetTimer = useCallback(() => {
    timerStart.current = Date.now();
  }, []);

  const stopAllTones = useCallback(() => {
    activeOscillators.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) { }
    });
    activeOscillators.current = [];
  }, []);

  const resetSimulation = useCallback(() => {
    isRunning.current = false;
    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = null;
    stopAllTones();

    if (simulationAreaRef.current) {
      const rect = simulationAreaRef.current.getBoundingClientRect();
      // Use logical width (full unscaled width) for placement calculations
      const areaWidth = rect.width;
      const areaHeight = rect.height;

      // Place robot at exact center of LOGICAL world
      robotState.current = {
        x: areaWidth / 2 - 20,
        y: areaHeight / 2 - 20,
        angle: -90,
        leftSpeed: 0,
        rightSpeed: 0,
      };

      // Reset to single cone
      conesDataRef.current = [
        { id: 1, x: areaWidth * 0.7, y: areaHeight * 0.3 },
      ];
      setCones([{ id: 1 }]);
    } else {
      robotState.current = {
        x: 100,
        y: 100,
        angle: 0,
        leftSpeed: 0,
        rightSpeed: 0,
      };
    }

    updateRobotPosition();
    setTimeout(updateConesPosition, 0);
    lcdClear();
    resetTimer();
    setConsoleOutput("");
    logToConsole("Simulation Reset.");

    // Reset Display
    if (ultraValueRef.current) ultraValueRef.current.innerText = "0";
    if (lSpeedValueRef.current) lSpeedValueRef.current.innerText = "0";
    if (rSpeedValueRef.current) rSpeedValueRef.current.innerText = "0";

    // Restart loop immediately
    lastTimeRef.current = Date.now();
    animationFrameId.current = requestAnimationFrame(loopRef.current);
  }, [
    logToConsole,
    updateRobotPosition,
    updateConesPosition,
    lcdClear,
    resetTimer,
    stopAllTones,
  ]);

  // --- Runtime Helpers (exposed to generated code) ---
  const wait = (seconds) =>
    new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  const moveIndefinitely = (left, right) => {
    robotState.current.leftSpeed = Number(left); // Ensure number
    robotState.current.rightSpeed = Number(right);
  };

  const move = async (left, right, seconds) => {
    moveIndefinitely(left, right);
    await wait(seconds);
    stopMoving();
  };

  const stopMoving = () => {
    robotState.current.leftSpeed = 0;
    robotState.current.rightSpeed = 0;
  };

  const getUltrasonicDistance = () => {
    let minDist = Infinity;
    conesDataRef.current.forEach((cone) => {
      const dx = cone.x - robotState.current.x;
      const dy = cone.y - robotState.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    });
    if (minDist === Infinity) return 255;
    return Math.min(255, Math.round(minDist / 5));
  };

  const getColorSensor = () => detectedColorRef.current;
  const getReflectedLightIntensity = () => 0;
  const getAmbientLightIntensity = () => 0;
  const isButtonPressed = (btn) => buttonStates.current[btn];

  const getGyroAngle = (axis) => {
    if (axis === "Z") return Math.round(robotState.current.angle % 360);
    return 0;
  };

  const getTimerValue = () => (Date.now() - timerStart.current) / 1000;

  const lcdPrint = (row, col, text) => {
    const r = Math.max(0, Math.min(1, Math.round(row - 1)));
    let c = Math.max(0, Math.min(15, Math.round(col - 1)));
    const str = String(text);
    for (let i = 0; i < str.length; i++) {
      const idx = r * 16 + c;
      if (idx < 32 && lcdCells.current[idx]) {
        lcdCells.current[idx].textContent = str[i];
        c++;
        if (c >= 16) break;
      }
    }
  };

  const lcdPrintForDuration = async (row, col, text, seconds) => {
    lcdPrint(row, col, text);
    await wait(seconds);
    lcdClear();
  };

  const getMouseWorldPos = (e, containerRect) => {
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;
    const mouseOffsetX = e.clientX - centerX;
    const mouseOffsetY = e.clientY - centerY;
    const scaledOffsetX = mouseOffsetX / zoomRef.current; // Use Zoom Ref
    const scaledOffsetY = mouseOffsetY / zoomRef.current;

    const logicalWidth = containerRect.width / zoomRef.current;
    const logicalHeight = containerRect.height / zoomRef.current;

    const finalX = logicalWidth / 2 + scaledOffsetX;
    const finalY = logicalHeight / 2 + scaledOffsetY;

    return { x: finalX, y: finalY };
  };

  const handleConeMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const containerRect = simulationAreaRef.current.getBoundingClientRect();
    let coneIndex = conesDataRef.current.findIndex((c) => c.id === id);
    if (coneIndex === -1) return;
    const cone = conesDataRef.current[coneIndex];
    const startMousePos = getMouseWorldPos(e, containerRect);
    const startOffsetX = startMousePos.x - cone.x;
    const startOffsetY = startMousePos.y - cone.y;

    const onMouseMove = (moveEvent) => {
      coneIndex = conesDataRef.current.findIndex((c) => c.id === id);
      if (coneIndex === -1) return;
      const currentMousePos = getMouseWorldPos(moveEvent, containerRect);
      let newX = currentMousePos.x - startOffsetX;
      let newY = currentMousePos.y - startOffsetY;

      // Map boundaries are fixed to container size
      const worldWidth = containerRect.width;
      const worldHeight = containerRect.height;

      newX = Math.max(0, Math.min(newX, worldWidth - 40));
      newY = Math.max(0, Math.min(newY, worldHeight - 40));

      conesDataRef.current[coneIndex].x = newX;
      conesDataRef.current[coneIndex].y = newY;
      const el = coneDomRefs.current[id];
      if (el) {
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
      }
    };

    const onMouseUp = (upEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (trashRef.current) {
        const trashRect = trashRef.current.getBoundingClientRect();
        if (
          upEvent.clientX >= trashRect.left &&
          upEvent.clientX <= trashRect.right &&
          upEvent.clientY >= trashRect.top &&
          upEvent.clientY <= trashRect.bottom
        ) {
          conesDataRef.current = conesDataRef.current.filter(
            (c) => c.id !== id
          );
          setCones((prev) => prev.filter((c) => c.id !== id));
        }
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleToolbarConeMouseDown = (e) => {
    e.preventDefault();
    if (!simulationAreaRef.current) return;
    const newId = Date.now();
    const containerRect = simulationAreaRef.current.getBoundingClientRect();
    const startMousePos = getMouseWorldPos(e, containerRect);
    const initialX = startMousePos.x - 20;
    const initialY = startMousePos.y - 20;
    const newCone = { id: newId, x: initialX, y: initialY };

    conesDataRef.current.push(newCone);
    setCones((prev) => [...prev, { id: newId }]);

    const startOffsetX = 20;
    const startOffsetY = 20;

    const onMouseMove = (moveEvent) => {
      const currentMousePos = getMouseWorldPos(moveEvent, containerRect);
      let newX = currentMousePos.x - startOffsetX;
      let newY = currentMousePos.y - startOffsetY;

      // Map boundaries are fixed to container size
      const worldWidth = containerRect.width;
      const worldHeight = containerRect.height;

      newX = Math.max(0, Math.min(newX, worldWidth - 40));
      newY = Math.max(0, Math.min(newY, worldHeight - 40));

      const idx = conesDataRef.current.findIndex((c) => c.id === newId);
      if (idx !== -1) {
        conesDataRef.current[idx].x = newX;
        conesDataRef.current[idx].y = newY;
        const el = coneDomRefs.current[newId];
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }
      }
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const clearAllCones = () => {
    if (simulationAreaRef.current) {
      const rect = simulationAreaRef.current.getBoundingClientRect();
      const areaWidth = rect.width / zoomRef.current;
      const areaHeight = rect.height / zoomRef.current;
      conesDataRef.current = [
        { id: 1, x: areaWidth * 0.7, y: areaHeight * 0.3 },
      ];
      setCones([{ id: 1 }]);
      setTimeout(updateConesPosition, 0);
    }
  };

  const selectColor = (color) => {
    const newColor = color === "none" ? "none" : color;
    detectedColorRef.current = newColor;
    setUiSelectedColor(newColor);
  };

  const playTone = (freq, sec, vol = 100) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    const oscillator = audioCtx.current.createOscillator();
    const gainNode = audioCtx.current.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
    gainNode.gain.setValueAtTime(vol / 100, audioCtx.current.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.current.destination);
    oscillator.start();
    activeOscillators.current.push(oscillator);
    return new Promise((resolve) => {
      setTimeout(() => {
        oscillator.stop();
        const index = activeOscillators.current.indexOf(oscillator);
        if (index > -1) {
          activeOscillators.current.splice(index, 1);
        }
        resolve();
      }, sec * 1000);
    });
  };

  const waitUntilButton = async (btn, state) => {
    const targetState = state === "PRESSED";
    while (buttonStates.current[btn] !== targetState) {
      if (!isRunning.current) return;
      await wait(0.01);
    }
  };

  // --- Simulation Loop (Moved to Ref to avoid closure staleness) ---
  const loopRef = useRef();
  loopRef.current = () => {
    const now = Date.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1); // Limit dt to 0.1s to prevent jumps
    lastTimeRef.current = now;

    // 1. Robot Physics
    if (
      robotState.current.leftSpeed !== 0 ||
      robotState.current.rightSpeed !== 0
    ) {
      const speed =
        (robotState.current.leftSpeed + robotState.current.rightSpeed) / 2;
      const rotation =
        (robotState.current.leftSpeed - robotState.current.rightSpeed) *
        3.0 *
        dt; // Tuned rotation speed

      robotState.current.angle += rotation;
      const rad = robotState.current.angle * (Math.PI / 180);

      // Movement: Reduced multiplier to 0.5 to slow down movement significantly
      // speed 50 * 0.5 = 25px/s = ~1.25 studs/s (a bit)
      const dist = speed * 0.5 * dt;

      let newX = robotState.current.x + Math.cos(rad) * dist;
      let newY = robotState.current.y + Math.sin(rad) * dist;

      if (simulationAreaRef.current) {
        const rect = simulationAreaRef.current.getBoundingClientRect();
        const robotSize = 40;
        // Corrected Boundary Checks: Fixed world size, independent of zoom
        const worldWidth = rect.width;
        const worldHeight = rect.height;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > worldWidth - robotSize) newX = worldWidth - robotSize;
        if (newY > worldHeight - robotSize) newY = worldHeight - robotSize;
      }
      robotState.current.x = newX;
      robotState.current.y = newY;
      updateRobotPosition();
    }

    // 2. Dashboard Updates
    let minDist = Infinity;
    if (Array.isArray(conesDataRef.current)) {
      conesDataRef.current.forEach((cone) => {
        const dx = cone.x - robotState.current.x;
        const dy = cone.y - robotState.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) minDist = dist;
      });
    }
    const displayDist =
      minDist === Infinity ? 255 : Math.min(255, Math.round(minDist / 5));

    if (ultraValueRef.current) ultraValueRef.current.innerText = displayDist;
    if (lSpeedValueRef.current)
      lSpeedValueRef.current.innerText = robotState.current.leftSpeed;
    if (rSpeedValueRef.current)
      rSpeedValueRef.current.innerText = robotState.current.rightSpeed;

    // Always request next frame
    animationFrameId.current = requestAnimationFrame(loopRef.current);
  };

  // Start loop on mount
  useEffect(() => {
    lastTimeRef.current = Date.now();
    animationFrameId.current = requestAnimationFrame(loopRef.current);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, []);

  // --- Blockly Initialization ---
  useEffect(() => {
    const loadBlockly = async () => {
      if (window.Blockly) {
        setIsBlocklyLoaded(true);
        return;
      }

      // Hack: Monaco Editor defines 'window.define' (AMD).
      // Blockly's UMD wrapper sees it and tries to register as an AMD module,
      // which conflicts with Monaco's loader ("Can only have one anonymous define call...").
      // We temporarily hide 'window.define' while loading Blockly.
      const amdDefine = window.define;
      if (amdDefine && amdDefine.amd) {
        window.define = null;
      }

      try {
        await loadScript("https://unpkg.com/blockly/blockly_compressed.js");
        await Promise.all([
          loadScript("https://unpkg.com/blockly/blocks_compressed.js"),
          loadScript("https://unpkg.com/blockly/javascript_compressed.js"),
          loadScript("https://unpkg.com/blockly/python_compressed.js"),
          loadScript("https://unpkg.com/blockly/msg/en.js")
        ]);
        let attempts = 0;
        while (!window.Blockly?.JavaScript && attempts < 20) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }
        if (window.Blockly) setIsBlocklyLoaded(true);
      } catch (error) {
        console.error("Failed to load Blockly", error);
      } finally {
        // Restore AMD define
        if (amdDefine) window.define = amdDefine;
      }
    };
    loadBlockly();
  }, []);

  // --- Define Blocks ---
  useEffect(() => {
    if (!isBlocklyLoaded || !blocklyDivRef.current) return;
    if (workspaceRef.current) return;

    const Blockly = window.Blockly;

    // Extensions
    if (!Blockly.Extensions.isRegistered("motor_control_extension")) {
      Blockly.Extensions.register("motor_control_extension", function () {
        this.updateShape_ = function () {
          const type = this.getFieldValue("TYPE");
          const hasSecondInput = this.getInput("SECONDS_INPUT");
          if (type === "ON_FOR_SECOND") {
            if (!hasSecondInput) {
              this.appendValueInput("SECONDS_INPUT")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Second");
              const shadowDom = Blockly.utils.xml.textToDom(
                '<shadow type="math_number"><field name="NUM">1</field></shadow>'
              );
              this.getInput("SECONDS_INPUT").connection.setShadowDom(shadowDom);
            }
          } else if (hasSecondInput) this.removeInput("SECONDS_INPUT");
        };
        this.updateShape_();
        this.setOnChange(function (e) {
          if (
            e.blockId === this.id &&
            e.element === "field" &&
            e.name === "TYPE"
          )
            this.updateShape_();
        });
      });
    }
    if (!Blockly.Extensions.isRegistered("lcd_display_extension")) {
      Blockly.Extensions.register("lcd_display_extension", function () {
        this.updateShape_ = function () {
          const type = this.getFieldValue("TYPE");
          const hasSecondInput = this.getInput("SECOND_INPUT");
          if (type === "ON_FOR_SECOND") {
            if (!hasSecondInput) {
              this.appendValueInput("SECOND_INPUT")
                .setCheck("Number")
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField("Second");
              const shadowDom = Blockly.utils.xml.textToDom(
                '<shadow type="math_number"><field name="NUM">1</field></shadow>'
              );
              this.getInput("SECOND_INPUT").connection.setShadowDom(shadowDom);
            }
          } else if (hasSecondInput) this.removeInput("SECOND_INPUT");
        };
        this.updateShape_();
        this.setOnChange(function (e) {
          if (
            e.blockId === this.id &&
            e.element === "field" &&
            e.name === "TYPE"
          )
            this.updateShape_();
        });
      });
    }

    // Definitions matching Toolbox XML
    const blocks = [
      {
        type: "motor_control",
        message0: "Motor Type %1 \n Left Speed %2 \n Right Speed %3",
        args0: [
          {
            type: "field_dropdown",
            name: "TYPE",
            options: [
              ["On For Second", "ON_FOR_SECOND"],
              ["On", "ON"],
            ],
          },
          {
            type: "input_value",
            name: "LEFT_SPEED",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "RIGHT_SPEED",
            check: "Number",
            align: "RIGHT",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        extensions: ["motor_control_extension"],
      },
      {
        type: "stop_moving",
        message0: "Stop Moving",
        previousStatement: null,
        nextStatement: null,
        colour: 230,
      },
      {
        type: "wait_seconds",
        message0: "Wait %1 seconds",
        args0: [{ type: "input_value", name: "SECONDS", check: "Number" }],
        previousStatement: null,
        nextStatement: null,
        colour: 45,
      },
      {
        type: "get_ultrasonic_distance",
        message0: "Return Distance (cm) Port %1",
        args0: [
          { type: "field_dropdown", name: "PORT", options: [["D26", "D26"]] },
        ],
        output: "Number",
        colour: 210,
      },
      {
        type: "wait_until_distance",
        message0: "Wait Until Distance %1 %2 %3 CM",
        args0: [
          { type: "field_dropdown", name: "PORT", options: [["D26", "D26"]] },
          {
            type: "field_dropdown",
            name: "OP",
            options: [
              [">", "GT"],
              ["<", "LT"],
              ["=", "EQ"],
            ],
          },
          { type: "input_value", name: "DISTANCE", check: "Number" },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: 210,
      },
      {
        type: "color_name",
        message0: "Return Color Name",
        output: "String",
        colour: 210,
      },
      {
        type: "color_dropdown",
        message0: "%1",
        args0: [
          {
            type: "field_dropdown",
            name: "COLOR",
            options: [
              ["Red", "'red'"],
              ["Green", "'green'"],
              ["Blue", "'blue'"],
              ["Black", "'black'"],
              ["White", "'white'"],
              ["Orange", "'orange'"],
              ["None", "'none'"],
            ],
          },
        ],
        output: "String",
        colour: 210,
      },
      {
        type: "lcd_display",
        message0: "Display Type %1",
        args0: [
          {
            type: "field_dropdown",
            name: "TYPE",
            options: [
              ["On For Second", "ON_FOR_SECOND"],
              ["On", "ON"],
            ],
          },
        ],
        message1: "Text %1",
        args1: [{ type: "input_value", name: "TEXT", align: "RIGHT" }],
        message2: "Row %1",
        args2: [
          { type: "input_value", name: "ROW", check: "Number", align: "RIGHT" },
        ],
        message3: "Column %1",
        args3: [
          { type: "input_value", name: "COL", check: "Number", align: "RIGHT" },
        ],
        message4: "Clear First %1",
        args4: [{ type: "field_checkbox", name: "CLEAR", checked: true }],
        previousStatement: null,
        nextStatement: null,
        colour: 160,
        extensions: ["lcd_display_extension"],
      },
      {
        type: "clear_screen",
        message0: "Clear Screen",
        previousStatement: null,
        nextStatement: null,
        colour: 160,
      },
      {
        type: "play_note_simple",
        message0: "Note %1 \n Port %2 \n Second %3 \n Play Type %4",
        args0: [
          {
            type: "field_dropdown",
            name: "NOTE",
            options: Object.keys({
              C4: 261.63,
              D4: 293.66,
              E4: 329.63,
              F4: 349.23,
              G4: 392.0,
              A4: 440.0,
              B4: 493.88,
              C5: 523.25,
            }).map((n) => [n, n]),
          },
          {
            type: "field_dropdown",
            name: "PORT",
            options: [["PWM", "PWM"]],
          },
          {
            type: "input_value",
            name: "SECOND",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_dropdown",
            name: "PLAY_TYPE",
            options: [
              ["Wait For Completion", "WAIT"],
              ["Play In Background", "NO_WAIT"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 300,
      },
      {
        type: "play_tone_simple",
        message0: "Tone %1 Hz \n Port %2 \n Second %3 \n Play Type %4",
        args0: [
          {
            type: "input_value",
            name: "TONE",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_dropdown",
            name: "PORT",
            options: [["PWM", "PWM"]],
          },
          {
            type: "input_value",
            name: "SECOND",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_dropdown",
            name: "PLAY_TYPE",
            options: [
              ["Wait For Completion", "WAIT"],
              ["Play In Background", "NO_WAIT"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 300,
      },
      {
        type: "play_note_volume",
        message0: "Note %1 \n Port %2 \n Volume %3 %% \n Second %4 \n Play Type %5",
        args0: [
          {
            type: "field_dropdown",
            name: "NOTE",
            options: Object.keys({
              C4: 261.63,
              D4: 293.66,
              E4: 329.63,
              F4: 349.23,
              G4: 392.0,
              A4: 440.0,
              B4: 493.88,
              C5: 523.25,
            }).map((n) => [n, n]),
          },
          {
            type: "field_dropdown",
            name: "PORT",
            options: [["PWM", "PWM"]],
          },
          {
            type: "input_value",
            name: "VOLUME",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "SECOND",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_dropdown",
            name: "PLAY_TYPE",
            options: [
              ["Wait For Completion", "WAIT"],
              ["Play In Background", "NO_WAIT"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 300,
      },
      {
        type: "play_tone_volume",
        message0: "Tone %1 Hz \n Port %2 \n Volume %3 %% \n Second %4 \n Play Type %5",
        args0: [
          {
            type: "input_value",
            name: "TONE",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_dropdown",
            name: "PORT",
            options: [["PWM", "PWM"]],
          },
          {
            type: "input_value",
            name: "VOLUME",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "SECOND",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_dropdown",
            name: "PLAY_TYPE",
            options: [
              ["Wait For Completion", "WAIT"],
              ["Play In Background", "NO_WAIT"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 300,
      },
      {
        type: "stop_buzzer",
        message0: "Stop Buzzer Loop",
        previousStatement: null,
        nextStatement: null,
        colour: 300, // Brownish color from image, but keeping green for now or changing to match image if needed. Image shows brown.
      },
      {
        type: "get_gyro_angle",
        message0: "Gyro Angle axis %1",
        args0: [
          {
            type: "field_dropdown",
            name: "AXIS",
            options: [
              ["Z", "Z"],
              ["X", "X"],
              ["Y", "Y"],
            ],
          },
        ],
        output: "Number",
        colour: 210,
      },
      {
        type: "forever_loop",
        message0: "forever %1 do %2",
        args0: [
          { type: "input_dummy" },
          { type: "input_statement", name: "DO" },
        ],
        previousStatement: null,
        colour: 120,
      },
      {
        type: "line_comment",
        message0: "# %1",
        args0: [{ type: "field_input", name: "TEXT", text: "Comment" }],
        previousStatement: null,
        nextStatement: null,
        colour: 160,
      },
      {
        type: "timer_value",
        message0: "Timer Value",
        output: "Number",
        colour: 45,
      },
      {
        type: "timer_reset",
        message0: "Reset Timer",
        previousStatement: null,
        nextStatement: null,
        colour: 45,
      },
      {
        type: "wait_until_button",
        message0: "Wait Until Button %1 Is %2",
        args0: [
          {
            type: "field_dropdown",
            name: "BUTTON",
            options: [
              ["D18", "D18"],
              ["D22", "D22"],
              ["D24", "D24"],
            ],
          },
          {
            type: "field_dropdown",
            name: "STATE",
            options: [
              ["Pressed", "PRESSED"],
              ["Released", "RELEASED"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 20,
      },
      {
        type: "return_button_value",
        message0: "Return Button Sensor Value At Port %1",
        args0: [
          {
            type: "field_dropdown",
            name: "BUTTON",
            options: [
              ["D18", "D18"],
              ["D22", "D22"],
              ["D24", "D24"],
            ],
          },
        ],
        output: "Number",
        colour: 210,
      },
      {
        type: "wait_until_color",
        message0: "Wait Until Color %1",
        args0: [
          {
            type: "field_dropdown",
            name: "COLOR",
            options: [
              ["Red", "'red'"],
              ["Green", "'green'"],
              ["Blue", "'blue'"],
              ["Black", "'black'"],
              ["White", "'white'"],
              ["Orange", "'orange'"],
              ["None", "'none'"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 210,
      },
      {
        type: "text_print",
        message0: "Print to Console %1",
        args0: [{ type: "input_value", name: "TEXT" }],
        previousStatement: null,
        nextStatement: null,
        colour: 160,
      },
    ];

    Blockly.defineBlocksWithJsonArray(blocks);

    const jsGen = Blockly.JavaScript;
    if (jsGen) {
      const ORDER_ATOMIC = jsGen.ORDER_ATOMIC || 0;
      const ORDER_NONE = jsGen.ORDER_NONE || 99;

      if (!jsGen.forBlock["math_number"]) {
        jsGen.forBlock["math_number"] = function (block) {
          const num = block.getFieldValue("NUM");
          return [String(num), ORDER_ATOMIC];
        };
      }

      jsGen.forBlock["motor_control"] = (b) => {
        const type = b.getFieldValue("TYPE");
        const left = jsGen.valueToCode(b, "LEFT_SPEED", ORDER_ATOMIC) || 0;
        const right = jsGen.valueToCode(b, "RIGHT_SPEED", ORDER_ATOMIC) || 0;
        if (type === "ON_FOR_SECOND") {
          const sec = jsGen.valueToCode(b, "SECONDS_INPUT", ORDER_ATOMIC) || 0;
          return `await move(${left}, ${right}, ${sec});\n`;
        }
        return `moveIndefinitely(${left}, ${right});\n`;
      };
      jsGen.forBlock["stop_moving"] = () => "await stopMoving();\n";
      jsGen.forBlock["wait_seconds"] = (b) =>
        `await wait(${jsGen.valueToCode(b, "SECONDS", ORDER_ATOMIC) || 0});\n`;
      jsGen.forBlock["get_ultrasonic_distance"] = () => [
        "getUltrasonicDistance()",
        ORDER_NONE,
      ];
      jsGen.forBlock["wait_until_distance"] = (b) => {
        const op = { GT: ">", LT: "<", EQ: "===" }[b.getFieldValue("OP")];
        const dist = jsGen.valueToCode(b, "DISTANCE", ORDER_ATOMIC) || 0;
        return `while (!(getUltrasonicDistance() ${op} ${dist})) { if(!isRunning.current) return; await wait(0.01); }\n`;
      };
      jsGen.forBlock["color_name"] = () => ["getColorSensor()", ORDER_NONE];
      jsGen.forBlock["color_dropdown"] = (b) => [
        `'${b.getFieldValue("COLOR").replace(/'/g, "")}'`,
        ORDER_ATOMIC,
      ];
      jsGen.forBlock["lcd_display"] = (b) => {
        const type = b.getFieldValue("TYPE");
        const text = jsGen.valueToCode(b, "TEXT", ORDER_ATOMIC) || "''";
        const row = jsGen.valueToCode(b, "ROW", ORDER_ATOMIC) || 1;
        const col = jsGen.valueToCode(b, "COL", ORDER_ATOMIC) || 1;
        const clear = b.getFieldValue("CLEAR") === "TRUE";
        let code = clear ? "lcdClear();\n" : "";
        if (type === "ON_FOR_SECOND") {
          const sec = jsGen.valueToCode(b, "SECOND_INPUT", ORDER_ATOMIC) || 1;
          code += `await lcdPrintForDuration(${row}, ${col}, ${text}, ${sec});\n`;
        } else {
          code += `lcdPrint(${row}, ${col}, ${text});\n`;
        }
        return code;
      };
      jsGen.forBlock["clear_screen"] = () => "lcdClear();\n";
      jsGen.forBlock["play_note_simple"] = (b) => {
        const note = b.getFieldValue("NOTE");
        const freq =
          {
            C4: 261.63,
            D4: 293.66,
            E4: 329.63,
            F4: 349.23,
            G4: 392.0,
            A4: 440.0,
            B4: 493.88,
            C5: 523.25,
          }[note] || 440;
        const sec = jsGen.valueToCode(b, "SECOND", ORDER_ATOMIC) || 1;
        return b.getFieldValue("PLAY_TYPE") === "WAIT"
          ? `await playTone(${freq}, ${sec});\n`
          : `playTone(${freq}, ${sec});\n`;
      };

      jsGen.forBlock["play_tone_simple"] = (b) => {
        const freq = jsGen.valueToCode(b, "TONE", ORDER_ATOMIC) || 440;
        const sec = jsGen.valueToCode(b, "SECOND", ORDER_ATOMIC) || 1;
        return b.getFieldValue("PLAY_TYPE") === "WAIT"
          ? `await playTone(${freq}, ${sec});\n`
          : `playTone(${freq}, ${sec});\n`;
      };

      jsGen.forBlock["play_note_volume"] = (b) => {
        const note = b.getFieldValue("NOTE");
        const freq =
          {
            C4: 261.63,
            D4: 293.66,
            E4: 329.63,
            F4: 349.23,
            G4: 392.0,
            A4: 440.0,
            B4: 493.88,
            C5: 523.25,
          }[note] || 440;
        const vol = jsGen.valueToCode(b, "VOLUME", ORDER_ATOMIC) || 100;
        const sec = jsGen.valueToCode(b, "SECOND", ORDER_ATOMIC) || 1;
        return b.getFieldValue("PLAY_TYPE") === "WAIT"
          ? `await playTone(${freq}, ${sec}, ${vol});\n`
          : `playTone(${freq}, ${sec}, ${vol});\n`;
      };

      jsGen.forBlock["play_tone_volume"] = (b) => {
        const freq = jsGen.valueToCode(b, "TONE", ORDER_ATOMIC) || 440;
        const vol = jsGen.valueToCode(b, "VOLUME", ORDER_ATOMIC) || 100;
        const sec = jsGen.valueToCode(b, "SECOND", ORDER_ATOMIC) || 1;
        return b.getFieldValue("PLAY_TYPE") === "WAIT"
          ? `await playTone(${freq}, ${sec}, ${vol});\n`
          : `playTone(${freq}, ${sec}, ${vol});\n`;
      };
      jsGen.forBlock["stop_buzzer"] = () => "stopAllTones();\n";
      jsGen.forBlock["get_gyro_angle"] = (b) => [
        `getGyroAngle('${b.getFieldValue("AXIS")}')`,
        ORDER_NONE,
      ];
      jsGen.forBlock["forever_loop"] = (b) =>
        `while (true) {\n  if(!isRunning.current) return;\n ${jsGen.statementToCode(
          b,
          "DO"
        )}\n await wait(0.01);\n}\n`;
      jsGen.forBlock["line_comment"] = (b) => `// ${b.getFieldValue("TEXT")}\n`;
      jsGen.forBlock["timer_value"] = () => ["getTimerValue()", ORDER_NONE];
      jsGen.forBlock["timer_reset"] = () => "resetTimer();\n";
      jsGen.forBlock["wait_until_button"] = (b) =>
        `await waitUntilButton('${b.getFieldValue(
          "BUTTON"
        )}', '${b.getFieldValue("STATE")}');\n`;
      jsGen.forBlock["return_button_value"] = (b) => [
        `(isButtonPressed('${b.getFieldValue("BUTTON")}') ? 1 : 0)`,
        ORDER_ATOMIC,
      ];
      jsGen.forBlock["wait_until_color"] = (b) =>
        `while (getColorSensor() !== '${b
          .getFieldValue("COLOR")
          .replace(
            /'/g,
            ""
          )}') { if(!isRunning.current) return; await wait(0.01); }\n`;
      jsGen.forBlock["text_print"] = (b) =>
        `logToConsole(${jsGen.valueToCode(b, "TEXT", ORDER_ATOMIC) || "''"
        });\n`;
    }

    workspaceRef.current = Blockly.inject(blocklyDivRef.current, {
      toolbox: TOOLBOX_XML,
      scrollbars: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
    });

    const updateCode = () => {
      if (Blockly.JavaScript) {
        Blockly.JavaScript.addReservedWords("code");
        const code = Blockly.JavaScript.workspaceToCode(workspaceRef.current);
        setGeneratedCode(code);
      }
    };
    workspaceRef.current.addChangeListener(updateCode);
    setWorkspaceReady(true);

    // Load Blockly XML from preview snippet if in preview mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('previewMode') === 'true') {
      const snippetData = sessionStorage.getItem('previewSnippet');
      console.log('Preview mode detected, snippet data:', snippetData ? 'found' : 'not found');
      if (snippetData) {
        const snippet = JSON.parse(snippetData);
        console.log('Preview snippet:', { 
          hasBlocklyXml: !!snippet.blocklyXml, 
          blocklyXmlLength: snippet.blocklyXml?.length,
          hasCode: !!snippet.code,
          title: snippet.title 
        });
        
        // Load Blockly blocks if available - use setTimeout to ensure Blockly is fully ready
        if (snippet.blocklyXml && workspaceRef.current) {
          setTimeout(() => {
            try {
              const Blockly = window.Blockly;
              // Use Blockly.utils.xml (lowercase) for newer Blockly versions
              const xmlUtils = Blockly.utils?.xml || Blockly.Xml;
              if (Blockly && xmlUtils && xmlUtils.textToDom) {
                console.log('Loading Blockly XML into workspace...');
                // Clear existing blocks first
                workspaceRef.current.clear();
                const xml = xmlUtils.textToDom(snippet.blocklyXml);
                // Use Blockly.Xml.domToWorkspace if available, otherwise try serialization
                if (Blockly.Xml && Blockly.Xml.domToWorkspace) {
                  Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
                } else if (Blockly.serialization && Blockly.serialization.workspaces) {
                  // Newer Blockly uses serialization API
                  Blockly.serialization.workspaces.load(
                    Blockly.Xml.workspaceToDom ? null : JSON.parse(snippet.blocklyXml),
                    workspaceRef.current
                  );
                }
                console.log('Blockly XML loaded successfully');
              } else {
                console.error('Blockly XML utils not available:', { 
                  hasBlockly: !!Blockly, 
                  hasUtils: !!Blockly?.utils,
                  hasXml: !!xmlUtils 
                });
              }
            } catch (e) {
              console.error('Error loading Blockly XML:', e);
            }
          }, 500); // Give Blockly time to fully initialize
        } else {
          console.log('Cannot load Blockly XML:', { 
            hasXml: !!snippet.blocklyXml, 
            hasWorkspace: !!workspaceRef.current 
          });
        }
        // Also set the generated code directly (in case blocks don't load)
        if (snippet.code) {
          setGeneratedCode(snippet.code);
        }
      }
    }

    resetSimulation();
  }, [isBlocklyLoaded, resetSimulation]);

  // --- Run Code Logic ---
  const runCode = async () => {
    if (isRunning.current) return;
    resetSimulation();
    isRunning.current = true;
    logToConsole("Program Started...");

    try {
      const scope = {
        move,
        moveIndefinitely,
        stopMoving,
        wait,
        getUltrasonicDistance,
        getColorSensor,
        getReflectedLightIntensity,
        getAmbientLightIntensity,
        isButtonPressed,
        getGyroAngle,
        getTimerValue,
        resetTimer,
        lcdPrint,
        lcdClear,
        lcdPrintForDuration,
        playTone,
        stopAllTones,
        waitUntilButton,
        logToConsole,
        isRunning,
      };

      const keys = Object.keys(scope);
      const values = Object.values(scope);

      const wrappedCode = `
                return (async () => { 
                    try { 
                        ${generatedCode} 
                        logToConsole("Program Ended.");
                    } catch(e) { 
                        logToConsole("Error: " + e.message); 
                        console.error(e);
                    } 
                    // REMOVED: finally { isRunning.current = false; }
                    // We keep isRunning true so physics continues if motor was left on.
                })();
            `;

      const fn = new Function(...keys, wrappedCode); // eslint-disable-line no-new-func
      await fn(...values);
    } catch (e) {
      logToConsole("System Error: " + e.message);
      isRunning.current = false;
    }
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (workspaceRef.current) {
        window.Blockly.svgResize(workspaceRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect to update positions on initial load or reset
  useEffect(() => {
    updateConesPosition();
  }, [cones, updateConesPosition]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans">
      {/* Preview Mode Banner */}
      {previewSnippet && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold">📋 Review Preview</span>
            <span className="text-amber-200">|</span>
            <span>
              <strong className="capitalize">{previewSnippet.username || 'Unknown'}</strong>'s submission: <strong>{previewSnippet.title}</strong>
            </span>
            {previewSnippet.levelName && (
              <>
                <span className="text-amber-200">|</span>
                <span className="text-amber-100">{previewSnippet.levelName}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Admin Review Actions - only show if this came from a review (has challengeId + ackKey) */}
            {previewSnippet.challengeId && previewSnippet.ackKey && (
              <>
                <button
                  onClick={async () => {
                    const comment = prompt('Add feedback comment (optional):') || '';
                    try {
                      const data = await pb.collection('challenges').getOne(previewSnippet.challengeId);
                      const acks = data.acknowledgements || {};
                      const comments = data.submissionComments || {};
                      acks[previewSnippet.ackKey] = {
                        ...acks[previewSnippet.ackKey],
                        status: 'needs_revision',
                        reviewedAt: new Date().toISOString(),
                      };
                      if (comment) comments[previewSnippet.ackKey] = comment;
                      await pb.collection('challenges').update(previewSnippet.challengeId, {
                        acknowledgements: acks,
                        submissionComments: comments,
                      });
                      alert('Marked as needs revision.');
                      sessionStorage.removeItem('previewMode');
                      sessionStorage.removeItem('previewSnippet');
                      sessionStorage.removeItem('reviewPreview');
                      window.close();
                    } catch (e) {
                      console.error('Error:', e);
                      alert('Failed to update: ' + (e?.message || e));
                    }
                  }}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium"
                >
                  ✏️ Request Revision
                </button>
                <button
                  onClick={async () => {
                    const comment = prompt('Add feedback comment (optional):') || '';
                    try {
                      const data = await pb.collection('challenges').getOne(previewSnippet.challengeId);
                      const acks = data.acknowledgements || {};
                      const comments = data.submissionComments || {};
                      acks[previewSnippet.ackKey] = {
                        ...acks[previewSnippet.ackKey],
                        status: 'approved',
                        reviewedAt: new Date().toISOString(),
                      };
                      if (comment) comments[previewSnippet.ackKey] = comment;
                      await pb.collection('challenges').update(previewSnippet.challengeId, {
                        acknowledgements: acks,
                        submissionComments: comments,
                      });
                      alert('Submission approved!');
                      sessionStorage.removeItem('previewMode');
                      sessionStorage.removeItem('previewSnippet');
                      sessionStorage.removeItem('reviewPreview');
                      window.close();
                    } catch (e) {
                      console.error('Error:', e);
                      alert('Failed to update: ' + (e?.message || e));
                    }
                  }}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
                >
                  ✅ Approve
                </button>
              </>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem('previewMode');
                sessionStorage.removeItem('previewSnippet');
                sessionStorage.removeItem('reviewPreview');
                window.close();
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Header with Home Button */}
      <div className="h-12 bg-slate-900 text-white flex items-center px-4 shadow-md z-20 shrink-0">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Home size={18} />
          <span className="font-medium text-sm">Home</span>
        </button>
        <div className="ml-4 h-6 w-px bg-slate-700"></div>
        <span className="ml-4 font-semibold text-sm tracking-wide">Blockly Robot Simulator</span>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Blockly Workspace */}
        <div className="w-[55%] h-full border-r border-gray-300 relative">
          {!isBlocklyLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              Loading Blockly...
            </div>
          )}
          <div
            ref={blocklyDivRef}
            className="absolute inset-0 blockly-div"
            onMouseDown={(e) => {
              // Ensure clicking the background closes the Flyout/Trashcan popups
              const target = e.target;
              const isBackground =
                target === blocklyDivRef.current ||
                (target.classList &&
                  target.classList.contains("blocklyMainBackground")) ||
                (target.getAttribute &&
                  target.getAttribute("class") === "blocklySvg");

              if (isBackground && window.Blockly) {
                window.Blockly.hideChaff();
              }
            }}
          />
        </div>

        {/* Right Panel */}
        <div className="w-[45%] h-full flex flex-col bg-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-300 bg-white">
            {["task", "robot", "console", "python"].map((tab) => {
              if (tab === "task" && challenges.length === 0) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-4 border-b-2 capitalize transition-colors ${activeTab === tab
                    ? "border-blue-500 text-blue-600 font-bold bg-blue-50"
                    : "border-transparent hover:bg-gray-50"
                    }`}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Task View */}
            <div
              className={`${activeTab === "task"
                ? "flex-grow bg-white p-6 overflow-y-auto"
                : "hidden"
                }`}>
              {challenges.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <BookOpen size={20} className="text-blue-500" />
                      {challenges[currentChallengeIndex].challengeName}
                    </h2>
                    <div className="flex items-center gap-3">
                      {/* Completion Status */}
                      {completedChallenges.includes(challenges[currentChallengeIndex]?.id) && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <CheckCircle size={14} />
                          Completed
                        </span>
                      )}
                      {/* Admin Reset Button */}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={handleResetProgress}
                          disabled={resettingProgress}
                          className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-full transition-colors disabled:opacity-50"
                          title="Reset all progress for this level">
                          <RotateCcw size={14} className={resettingProgress ? 'animate-spin' : ''} />
                          {resettingProgress ? 'Resetting...' : 'Reset Progress'}
                        </button>
                      )}
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          disabled={currentChallengeIndex === 0}
                          onClick={() => setCurrentChallengeIndex(0)}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 transition-all"
                          title="Go to first challenge">
                          <ChevronsLeft size={18} />
                        </button>
                        <button
                          disabled={currentChallengeIndex === 0}
                          onClick={() => setCurrentChallengeIndex((prev) => prev - 1)}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 transition-all">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-xs font-medium text-slate-500 min-w-[3rem] text-center">
                          {currentChallengeIndex + 1} / {challenges.length}
                        </span>
                        <button
                          disabled={currentChallengeIndex === challenges.length - 1 || !isChallengeUnlocked(currentChallengeIndex + 1)}
                          onClick={() => setCurrentChallengeIndex((prev) => prev + 1)}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 transition-all"
                          title={!isChallengeUnlocked(currentChallengeIndex + 1) ? "Complete current challenge first" : ""}>
                          {isChallengeUnlocked(currentChallengeIndex + 1) ? (
                            <ChevronRight size={18} />
                          ) : (
                            <Lock size={16} className="text-slate-400" />
                          )}
                        </button>
                        <button
                          disabled={currentChallengeIndex === challenges.length - 1}
                          onClick={() => {
                            // Jump to the last unlocked challenge
                            let lastUnlocked = currentChallengeIndex;
                            for (let i = challenges.length - 1; i > currentChallengeIndex; i--) {
                              if (isChallengeUnlocked(i)) { lastUnlocked = i; break; }
                            }
                            setCurrentChallengeIndex(lastUnlocked);
                          }}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 transition-all"
                          title="Go to last unlocked challenge">
                          <ChevronsRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none text-slate-600">
                    {/* Handle both HTML string and plain text description */}
                    {challenges[currentChallengeIndex].description?.includes('<') ? (
                      <div dangerouslySetInnerHTML={{ __html: challenges[currentChallengeIndex].description }} />
                    ) : (
                      <p className="whitespace-pre-wrap">{challenges[currentChallengeIndex].description}</p>
                    )}
                  </div>

                  {challenges[currentChallengeIndex].hint && (
                    <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                      <strong className="block mb-1">Hint:</strong>
                      {challenges[currentChallengeIndex].hint}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <BookOpen size={48} className="mb-4 opacity-20" />
                  <p>No challenges loaded for this level.</p>
                </div>
              )}
            </div>

            {/* Robot Simulation View */}
            <div
              className={`${activeTab === "robot"
                ? "flex-grow flex flex-col p-4 space-y-4"
                : "hidden"
                }`}>
              {/* Toolbar (Cone, Trash) */}
              <div className="bg-gray-300 rounded p-2 flex justify-between items-center shadow-inner">
                <div
                  className="cursor-grab hover:scale-105 transition-transform"
                  title="Drag new cone"
                  onMouseDown={handleToolbarConeMouseDown}>
                  <ConeIcon className="w-10 h-10" />
                </div>
                <div
                  className="cursor-pointer hover:text-red-500 text-green-400"
                  title="Clear All (Reset)"
                  ref={trashRef}
                  onClick={clearAllCones}>
                  <TrashIcon className="w-8 h-8" />
                </div>
              </div>

              {/* Canvas Area */}
              <div
                ref={simulationAreaRef}
                className="flex-grow bg-[#D1D5DB] rounded-lg relative overflow-hidden shadow-inner border-2 border-gray-400 select-none">
                {/* Scaled World Wrapper */}
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    width: "100%",
                    height: "100%",
                  }}>
                  {/* Dotted Grid Background (Inside wrapper to scale) */}
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "radial-gradient(#555 1.5px, transparent 1.5px)",
                      backgroundSize: "20px 20px",
                      width: "200%", // Extend background for zoom
                      height: "200%",
                      left: "-50%", // Center the background pattern expansion
                      top: "-50%",
                    }}></div>

                  <div
                    ref={colorPatchContainerRef}
                    className="absolute inset-0 pointer-events-none"></div>

                  {/* Robot: Blue Body with Wheels */}
                  <div
                    ref={robotRef}
                    className="absolute w-10 h-10 transition-transform duration-75 z-10 flex items-center justify-center">
                    <div className="relative w-full h-full bg-[#4285F4] rounded-sm shadow-sm flex justify-center items-center">
                      {/* Left Wheel */}
                      <div className="absolute -left-1 top-1 w-2 h-8 bg-gray-800 rounded-sm"></div>
                      {/* Right Wheel */}
                      <div className="absolute -right-1 top-1 w-2 h-8 bg-gray-800 rounded-sm"></div>
                      {/* Front Indicator */}
                      <div className="absolute -top-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                      {/* Center Detail */}
                      <div className="w-4 h-6 bg-blue-700 rounded-sm opacity-50"></div>
                    </div>
                  </div>

                  {/* Draggable Cones */}
                  {cones.map((cone) => (
                    <div
                      key={cone.id}
                      ref={(el) => {
                        if (el) coneDomRefs.current[cone.id] = el;
                        // Initialize position
                        const data = conesDataRef.current.find(
                          (c) => c.id === cone.id
                        );
                        if (el && data) {
                          el.style.left = `${data.x}px`;
                          el.style.top = `${data.y}px`;
                        }
                      }}
                      onMouseDown={(e) => handleConeMouseDown(e, cone.id)}
                      className="absolute w-12 h-12 z-20 cursor-grab hover:scale-105 transition-transform -ml-6 -mt-6">
                      <ConeIcon className="w-full h-full drop-shadow-md" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls: Color, LCD, Data */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
                  <div className="flex items-center gap-2">
                    <span>FLASH COLOUR</span>
                    <div className="flex gap-[1px]">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-1 h-3 bg-gray-400"></div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>SCALE</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-blue-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-6">
                  {/* Left: Inputs */}
                  <div className="space-y-4">
                    {/* Color Pickers */}
                    <div className="flex gap-2">
                      {["black", "white", "gray", "white"].map((c, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full border-2 border-gray-300 ${c === "black" ? "bg-gray-800" : "bg-white"
                            } ${i === 3 ? "border-dashed" : ""}`}></div>
                      ))}
                    </div>

                    {/* Large Colors */}
                    <div className="flex gap-2">
                      {["white", "red", "orange", "green", "blue"].map((c) => (
                        <div
                          key={c}
                          className={`w-8 h-12 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform ${uiSelectedColor === c ? "ring-2 ring-blue-500" : ""
                            }`}
                          style={{
                            backgroundColor: c === "white" ? "#fff" : c,
                          }}
                          onClick={() => selectColor(c)}></div>
                      ))}
                    </div>

                    {/* Buttons */}
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold mb-1">
                        CLICK BUTTONS
                      </div>
                      <div className="flex gap-3">
                        {[
                          { id: "D18", label: "A" },
                          { id: "D22", label: "S" },
                          { id: "D24", label: "D" },
                        ].map((btn) => (
                          <div
                            key={btn.id}
                            className="flex flex-col items-center">
                            <button
                              onMouseDown={() =>
                                (buttonStates.current[btn.id] = true)
                              }
                              onMouseUp={() =>
                                (buttonStates.current[btn.id] = false)
                              }
                              onMouseLeave={() =>
                                (buttonStates.current[btn.id] = false)
                              }
                              className="w-10 h-10 rounded-full bg-gray-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] active:bg-gray-400 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {btn.id}
                            </button>
                            <span className="text-[10px] text-gray-400 mt-1">
                              {btn.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Display */}
                  <div className="space-y-4">
                    {/* LCD */}
                    <div className="bg-gray-200 p-1">
                      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] grid-rows-2 gap-[1px] bg-[#3B82F6] border-4 border-[#3B82F6]">
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div
                            key={i}
                            ref={(el) => (lcdCells.current[i] = el)}
                            className="bg-[#1E40AF] text-white aspect-[3/5] flex items-center justify-center font-mono text-[20px] leading-none overflow-hidden select-none">
                            &nbsp;
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Data */}
                    <div className="flex gap-6">
                      <div className="flex flex-col w-20">
                        <span className="text-[10px] text-gray-500 font-bold mb-1">
                          Ultra-D26
                        </span>
                        <div
                          className="bg-[#A0A0A0] h-10 flex items-center px-2 text-2xl font-sans text-[#404040]"
                          ref={ultraValueRef}>
                          0
                        </div>
                      </div>
                      <div className="flex flex-col w-20">
                        <span className="text-[10px] text-gray-500 font-bold mb-1">
                          L-SPEED
                        </span>
                        <div
                          className="bg-[#A0A0A0] h-10 flex items-center px-2 text-2xl font-sans text-[#404040]"
                          ref={lSpeedValueRef}>
                          0
                        </div>
                      </div>
                      <div className="flex flex-col w-20">
                        <span className="text-[10px] text-gray-500 font-bold mb-1">
                          R-SPEED
                        </span>
                        <div
                          className="bg-[#A0A0A0] h-10 flex items-center px-2 text-2xl font-sans text-[#404040]"
                          ref={rSpeedValueRef}>
                          0
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Console View */}
            <div
              className={`${activeTab === "console"
                ? "flex-grow bg-slate-900 text-green-400 p-4 font-mono text-sm overflow-y-auto"
                : "hidden"
                }`}>
              <pre className="whitespace-pre-wrap">
                {consoleOutput || "> Ready..."}
              </pre>
            </div>

            {/* Code View */}
            <div
              className={`${activeTab === "python"
                ? "flex-grow bg-white text-slate-800 p-4 font-mono text-xs overflow-y-auto border-t border-gray-300"
                : "hidden"
                }`}>
              <div className="h-full">
                {activeTab === "python" && (
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-light"
                    value={generatedCode || "// Drag blocks to generate code..."}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="p-4 bg-gray-100 border-t border-gray-300 flex space-x-3 z-10">
            <button
              onClick={runCode}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded shadow transition-colors flex items-center justify-center gap-2">
              ▶ Run Program
            </button>
            <button
              onClick={resetSimulation}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded shadow transition-colors flex items-center justify-center gap-2">
              ⏹ Reset / Stop
            </button>
            {currentUser?.role === 'teacher' && challenges.length > 0 && (() => {
              const currentId = challenges[currentChallengeIndex]?.id;
              const isCompleted = completedChallenges.includes(currentId);
              const needsRevision = revisionChallenges.includes(currentId);
              
              if (needsRevision) {
                return (
                  <button
                    onClick={handleSubmitChallenge}
                    disabled={submitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded shadow transition-colors flex items-center justify-center gap-2 animate-pulse">
                    <Send size={18} />
                    {submitting ? 'Resubmitting...' : '🔄 Resubmit Challenge'}
                  </button>
                );
              }
              
              return (
                <button
                  onClick={handleSubmitChallenge}
                  disabled={submitting || isCompleted}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded shadow transition-colors flex items-center justify-center gap-2">
                  <Send size={18} />
                  {submitting ? 'Submitting...' : isCompleted ? 'Submitted' : 'Submit Challenge'}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlocklyRobotSimulator;
