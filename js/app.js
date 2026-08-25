/**
 * Yaylak - Kışlak - Göç Etkileşimli Öğrenme Etkinliği
 * MEBİ Pedagojik Standartları ve PRD Mimarisi
 */

(function () {
    'use strict';

    // ==========================================================================
    // 1. Durum Yönetimi (State)
    // ==========================================================================
    const state = {
        currentScreen: 'screen-home',
        visitedYaylak: false,
        visitedKislak: false,
        openedYaylakInfo: new Set(),
        openedKislakInfo: new Set(),
        decisionAnswered: false,
        decisionCorrect: false,
        migrationCompleted: false,
        soundEnabled: true
    };

    // ==========================================================================
    // 2. İçerik Verileri (Hotspot Metinleri)
    // ==========================================================================
    const HOTSPOT_DATA = {
        yaylak: {
            y1: {
                icon: '🌿',
                title: 'Hayvancılık',
                text: 'Geniş otlaklar hayvanların beslenmesi için elverişlidir. Hayvancılık, konargöçerlerin temel geçim kaynaklarından biridir.'
            },
            y2: {
                icon: '⛺',
                title: 'Barınma',
                text: 'Konargöçerler taşınabilir keçe çadırları kullanarak mevsimlere göre farklı bölgelere hareket edebilirdi.'
            },
            y3: {
                icon: '🐎',
                title: 'Hayvanlar',
                text: 'Koyun, keçi, at ve sığır gibi hayvanlar konargöçer yaşamın ve ekonominin en önemli parçasıdır.'
            }
        },
        kislak: {
            k1: {
                icon: '🏔️',
                title: 'Korunaklı Bölge',
                text: 'Kışlaklar sert kış koşullarından, dondurucu rüzgârlardan daha az etkilenmek için korunaklı vadilerde seçilirdi.'
            },
            k2: {
                icon: '⛺',
                title: 'Kış Barınağı',
                text: 'Kışın soğuk hava koşulları nedeniyle barınma alanlarının ve çadırların daha korunaklı olması önemlidir.'
            },
            k3: {
                icon: '🐑',
                title: 'Hayvanların Korunması',
                text: 'Hayvanların kış boyunca soğuktan korunması ve beslenmesi yaşamın sürekliliği açısından önemlidir.'
            }
        }
    };

    // ==========================================================================
    // 3. DOM Elemanları Seçimi
    // ==========================================================================
    const DOM = {
        screens: document.querySelectorAll('.screen'),
        navSteps: document.querySelectorAll('.step-item'),
        
        // Araç Butonları
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        btnFullscreen: document.getElementById('btn-fullscreen'),
        
        // Harita Ekranı
        btnHotspotYaylak: document.getElementById('btn-hotspot-yaylak'),
        btnHotspotKislak: document.getElementById('btn-hotspot-kislak'),
        badgeVisitedYaylak: document.getElementById('badge-visited-yaylak'),
        badgeVisitedKislak: document.getElementById('badge-visited-kislak'),
        discoveryStatusText: document.getElementById('discovery-status-text'),
        homeFooterHint: document.getElementById('home-footer-hint'),
        btnToCompare: document.getElementById('btn-to-compare'),
        
        // Yaylak Ekranı
        yaylakCounterText: document.getElementById('yaylak-counter-text'),
        popoverYaylak: document.getElementById('popover-yaylak'),
        popoverYaylakIcon: document.getElementById('popover-yaylak-icon'),
        popoverYaylakTitle: document.getElementById('popover-yaylak-title'),
        popoverYaylakText: document.getElementById('popover-yaylak-text'),
        btnYaylakToKislak: document.getElementById('btn-yaylak-to-kislak'),
        
        // Kışlak Ekranı
        kislakCounterText: document.getElementById('kislak-counter-text'),
        popoverKislak: document.getElementById('popover-kislak'),
        popoverKislakIcon: document.getElementById('popover-kislak-icon'),
        popoverKislakTitle: document.getElementById('popover-kislak-title'),
        popoverKislakText: document.getElementById('popover-kislak-text'),
        btnKislakToCompare: document.getElementById('btn-kislak-to-compare'),
        
        // Karşılaştırma Ekranı
        btnToDecision: document.getElementById('btn-to-decision'),
        
        // Karar Ekranı
        btnOptYaylak: document.getElementById('btn-opt-yaylak'),
        btnOptKislak: document.getElementById('btn-opt-kislak'),
        decisionFeedback: document.getElementById('decision-feedback'),
        feedbackIcon: document.getElementById('feedback-icon'),
        feedbackTitle: document.getElementById('feedback-title'),
        feedbackMessage: document.getElementById('feedback-message'),
        btnStartMigration: document.getElementById('btn-start-migration'),
        btnRetryDecision: document.getElementById('btn-retry-decision'),
        
        // Göç Animasyonu
        caravanActor: document.getElementById('caravan-actor'),
        migrationStatusText: document.getElementById('migration-status-text'),
        migrationCompleteCard: document.getElementById('migration-complete-card'),
        btnToResult: document.getElementById('btn-to-result'),
        
        // Sonuç Ekranı
        btnRestartActivity: document.getElementById('btn-restart-activity'),
        btnReturnHome: document.getElementById('btn-return-home'),
        
        // Ortak Geri Dönüş Butonları
        btnBackHomeList: document.querySelectorAll('.btn-back-home')
    };

    // ==========================================================================
    // 4. Web Audio API (Dahili Ses Efektleri Sentezleyici)
    // ==========================================================================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, type, duration, gainValue = 0.12) {
        if (!state.soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(gainValue, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Ses desteği olmayan durumları sessiz geç
        }
    }

    function playSound(type) {
        if (!state.soundEnabled) return;
        switch (type) {
            case 'click':
                playTone(440, 'sine', 0.08, 0.08);
                break;
            case 'pop':
                playTone(600, 'triangle', 0.12, 0.1);
                setTimeout(() => playTone(880, 'sine', 0.15, 0.1), 60);
                break;
            case 'correct':
                playTone(523.25, 'sine', 0.15, 0.15); // C5
                setTimeout(() => playTone(659.25, 'sine', 0.18, 0.15), 100); // E5
                setTimeout(() => playTone(783.99, 'sine', 0.3, 0.18), 200); // G5
                setTimeout(() => playTone(1046.50, 'sine', 0.4, 0.15), 320); // C6
                break;
            case 'wrong':
                playTone(330, 'sawtooth', 0.15, 0.1);
                setTimeout(() => playTone(280, 'sawtooth', 0.25, 0.12), 120);
                break;
            case 'caravan':
                playTone(220, 'triangle', 0.2, 0.08);
                setTimeout(() => playTone(330, 'sine', 0.2, 0.06), 150);
                break;
            case 'finish':
                playTone(587.33, 'sine', 0.2, 0.15);
                setTimeout(() => playTone(880, 'sine', 0.35, 0.18), 160);
                break;
        }
    }

    // ==========================================================================
    // 5. SCORM Entegrasyon Desteği
    // ==========================================================================
    function notifySCORMCompletion() {
        try {
            if (window.pipwerks && window.pipwerks.SCORM) {
                window.pipwerks.SCORM.set("cmi.core.lesson_status", "completed");
                window.pipwerks.SCORM.set("cmi.completion_status", "completed");
                window.pipwerks.SCORM.save();
            }
        } catch (err) {
            // SCORM logu konsola yazdırılmaz
        }
    }

    // ==========================================================================
    // 6. Ekran Yönetimi ve Gezinme (Screen Navigation)
    // ==========================================================================
    function showScreen(screenId) {
        state.currentScreen = screenId;

        // Tüm ekranları gizle
        DOM.screens.forEach(s => s.classList.remove('active'));

        // Hedef ekranı göster
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        // Açık popover'ları kapat
        closeInfo('yaylak');
        closeInfo('kislak');

        // İlerleme adımlarını güncelle
        updateProgressSteps(screenId);

        // Ekran özel işlemleri
        if (screenId === 'screen-home') {
            updateHomeMapState();
        }
    }

    function updateProgressSteps(screenId) {
        let stepNumber = 1;

        if (screenId === 'screen-home') {
            stepNumber = 1;
        } else if (screenId === 'screen-yaylak' || screenId === 'screen-kislak') {
            stepNumber = 2;
        } else if (screenId === 'screen-compare') {
            stepNumber = 3;
        } else if (screenId === 'screen-decision') {
            stepNumber = 4;
        } else if (screenId === 'screen-migration' || screenId === 'screen-result') {
            stepNumber = 5;
        }

        DOM.navSteps.forEach(step => {
            const stepVal = parseInt(step.getAttribute('data-step'), 10);
            step.classList.remove('active', 'completed');

            if (stepVal === stepNumber) {
                step.classList.add('active');
            } else if (stepVal < stepNumber) {
                step.classList.add('completed');
            }
        });
    }

    function updateHomeMapState() {
        let visitedCount = 0;

        if (state.visitedYaylak) {
            DOM.badgeVisitedYaylak.style.display = 'inline-block';
            visitedCount++;
        } else {
            DOM.badgeVisitedYaylak.style.display = 'none';
        }

        if (state.visitedKislak) {
            DOM.badgeVisitedKislak.style.display = 'inline-block';
            visitedCount++;
        } else {
            DOM.badgeVisitedKislak.style.display = 'none';
        }

        DOM.discoveryStatusText.textContent = `Keşif: ${visitedCount} / 2 Bölge`;

        // Karşılaştırma butonunu kontrol et
        if (state.visitedYaylak && state.visitedKislak) {
            DOM.btnToCompare.disabled = false;
            DOM.homeFooterHint.innerHTML = '✨ <strong>Tebrikler!</strong> Her iki bölgeyi de keşfettiniz. Artık karşılaştırma adımına geçebilirsiniz.';
        } else if (visitedCount === 1) {
            DOM.btnToCompare.disabled = true;
            DOM.homeFooterHint.innerHTML = '💡 <em>Diğer bölgeyi de ziyaret ettikten sonra karşılaştırma adımı açılacaktır.</em>';
        } else {
            DOM.btnToCompare.disabled = true;
            DOM.homeFooterHint.innerHTML = '💡 <em>İki bölgeyi de inceledikten sonra karşılaştırma adımı etkinleşecektir.</em>';
        }
    }

    // ==========================================================================
    // 7. Yaylak ve Kışlak Keşif İşlemleri
    // ==========================================================================
    function openYaylak() {
        playSound('click');
        state.visitedYaylak = true;
        showScreen('screen-yaylak');
        updateYaylakProgress();
    }

    function openKislak() {
        playSound('click');
        state.visitedKislak = true;
        showScreen('screen-kislak');
        updateKislakProgress();
    }

    function updateYaylakProgress() {
        const count = state.openedYaylakInfo.size;
        DOM.yaylakCounterText.textContent = `${count} / 3`;
        
        // Ziyaret edilen butonları vurgula
        state.openedYaylakInfo.forEach(id => {
            const btn = document.querySelector(`.info-hotspot[data-id="${id}"]`);
            if (btn) btn.classList.add('visited');
        });
    }

    function updateKislakProgress() {
        const count = state.openedKislakInfo.size;
        DOM.kislakCounterText.textContent = `${count} / 3`;
        
        // Ziyaret edilen butonları vurgula
        state.openedKislakInfo.forEach(id => {
            const btn = document.querySelector(`.info-hotspot[data-id="${id}"]`);
            if (btn) btn.classList.add('visited');
        });
    }

    function openInfo(type, id) {
        playSound('pop');
        const data = HOTSPOT_DATA[type]?.[id];
        if (!data) return;

        if (type === 'yaylak') {
            state.openedYaylakInfo.add(id);
            DOM.popoverYaylakIcon.textContent = data.icon;
            DOM.popoverYaylakTitle.textContent = data.title;
            DOM.popoverYaylakText.textContent = data.text;
            DOM.popoverYaylak.classList.add('active');
            DOM.popoverYaylak.setAttribute('aria-hidden', 'false');
            updateYaylakProgress();
        } else if (type === 'kislak') {
            state.openedKislakInfo.add(id);
            DOM.popoverKislakIcon.textContent = data.icon;
            DOM.popoverKislakTitle.textContent = data.title;
            DOM.popoverKislakText.textContent = data.text;
            DOM.popoverKislak.classList.add('active');
            DOM.popoverKislak.setAttribute('aria-hidden', 'false');
            updateKislakProgress();
        }
    }

    function closeInfo(type) {
        if (type === 'yaylak') {
            DOM.popoverYaylak.classList.remove('active');
            DOM.popoverYaylak.setAttribute('aria-hidden', 'true');
        } else if (type === 'kislak') {
            DOM.popoverKislak.classList.remove('active');
            DOM.popoverKislak.setAttribute('aria-hidden', 'true');
        }
    }

    // ==========================================================================
    // 8. Karar Sistemi (Decision Logic)
    // ==========================================================================
    function handleDecision(choice) {
        if (choice === 'kislak') {
            // DOĞRU CEVAP
            playSound('correct');
            state.decisionAnswered = true;
            state.decisionCorrect = true;

            DOM.btnOptKislak.classList.add('correct');
            DOM.btnOptKislak.classList.remove('incorrect');
            DOM.btnOptYaylak.classList.remove('correct', 'incorrect');
            DOM.btnOptKislak.setAttribute('aria-checked', 'true');
            DOM.btnOptYaylak.setAttribute('aria-checked', 'false');

            DOM.decisionFeedback.className = 'decision-feedback-box feedback-success';
            DOM.feedbackIcon.textContent = '🎉';
            DOM.feedbackTitle.textContent = 'Doğru Karar!';
            DOM.feedbackMessage.textContent = 'Kış mevsimi yaklaşırken daha alçak ve korunaklı bölgelere, yani kışlağa göç edilir.';
            DOM.btnStartMigration.style.display = 'inline-flex';
            DOM.btnRetryDecision.style.display = 'none';
            DOM.decisionFeedback.style.display = 'flex';
        } else {
            // YANLIŞ CEVAP
            playSound('wrong');
            state.decisionAnswered = true;
            state.decisionCorrect = false;

            DOM.btnOptYaylak.classList.add('incorrect');
            DOM.btnOptYaylak.classList.remove('correct');
            DOM.btnOptKislak.classList.remove('correct', 'incorrect');
            DOM.btnOptYaylak.setAttribute('aria-checked', 'true');
            DOM.btnOptKislak.setAttribute('aria-checked', 'false');

            DOM.decisionFeedback.className = 'decision-feedback-box feedback-error';
            DOM.feedbackIcon.textContent = '🤔';
            DOM.feedbackTitle.textContent = 'Henüz Uygun Değil';
            DOM.feedbackMessage.textContent = 'Kış yaklaşırken sert soğuklardan korunmak ve daha sıcak, korunaklı bölgelere geçmek gerekir. Lütfen tekrar değerlendiriniz.';
            DOM.btnStartMigration.style.display = 'none';
            DOM.btnRetryDecision.style.display = 'inline-flex';
            DOM.decisionFeedback.style.display = 'flex';
        }
    }

    function resetDecisionOptions() {
        DOM.btnOptYaylak.classList.remove('correct', 'incorrect');
        DOM.btnOptKislak.classList.remove('correct', 'incorrect');
        DOM.btnOptYaylak.setAttribute('aria-checked', 'false');
        DOM.btnOptKislak.setAttribute('aria-checked', 'false');
        DOM.decisionFeedback.style.display = 'none';
        state.decisionAnswered = false;
        state.decisionCorrect = false;
    }

    // ==========================================================================
    // 9. Göç Animasyonu İşlemleri (Migration Animation)
    // ==========================================================================
    function startMigration() {
        playSound('click');
        showScreen('screen-migration');

        // Animasyon durumunu sıfırla
        DOM.migrationCompleteCard.style.display = 'none';
        DOM.caravanActor.classList.remove('animating');
        DOM.migrationStatusText.textContent = 'Kafile yola çıkıyor...';

        // Kısa gecikmeyle animasyonu başlat
        setTimeout(() => {
            playSound('caravan');
            DOM.caravanActor.classList.add('animating');
        }, 150);

        // Aşamalı durum güncellemeleri
        setTimeout(() => {
            DOM.migrationStatusText.textContent = 'Dağ geçitleri ve vadiler aşılıyor...';
        }, 2000);

        setTimeout(() => {
            playSound('correct');
            DOM.migrationStatusText.textContent = 'Kışlağa başarıyla varıldı!';
            DOM.migrationCompleteCard.style.display = 'block';
            state.migrationCompleted = true;
        }, 4600);
    }

    // ==========================================================================
    // 10. Etkinliği Sıfırlama ve Başa Dönme (Reset Activity)
    // ==========================================================================
    function resetActivity() {
        playSound('finish');
        notifySCORMCompletion();

        state.visitedYaylak = false;
        state.visitedKislak = false;
        state.openedYaylakInfo.clear();
        state.openedKislakInfo.clear();
        state.decisionAnswered = false;
        state.decisionCorrect = false;
        state.migrationCompleted = false;

        // Hotspot görsel sınıflarını temizle
        document.querySelectorAll('.info-hotspot').forEach(btn => btn.classList.remove('visited'));

        resetDecisionOptions();
        updateHomeMapState();
        showScreen('screen-home');
    }

    // ==========================================================================
    // 11. Olay Dinleyicileri (Event Listeners)
    // ==========================================================================
    function setupEventListeners() {
        // Ses Aç/Kapat
        DOM.btnSoundToggle.addEventListener('click', () => {
            state.soundEnabled = !state.soundEnabled;
            DOM.btnSoundToggle.querySelector('.tool-icon').textContent = state.soundEnabled ? '🔊' : '🔇';
            if (state.soundEnabled) playSound('click');
        });

        // Tam Ekran
        DOM.btnFullscreen.addEventListener('click', () => {
            playSound('click');
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                DOM.btnFullscreen.querySelector('.tool-icon').textContent = '🗗';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                    DOM.btnFullscreen.querySelector('.tool-icon').textContent = '⛶';
                }
            }
        });

        // Harita Hotspotları
        DOM.btnHotspotYaylak.addEventListener('click', openYaylak);
        DOM.btnHotspotKislak.addEventListener('click', openKislak);

        // Haritaya Geri Dön Butonları
        DOM.btnBackHomeList.forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                showScreen('screen-home');
            });
        });

        // Harita -> Karşılaştırma
        DOM.btnToCompare.addEventListener('click', () => {
            playSound('click');
            showScreen('screen-compare');
        });

        // Yaylak -> Kışlak Keşfi
        DOM.btnYaylakToKislak.addEventListener('click', openKislak);

        // Kışlak -> Karşılaştırma
        DOM.btnKislakToCompare.addEventListener('click', () => {
            playSound('click');
            showScreen('screen-compare');
        });

        // Karşılaştırma -> Karar Ekranı
        DOM.btnToDecision.addEventListener('click', () => {
            playSound('click');
            showScreen('screen-decision');
        });

        // Görsel İçi Hotspotlar (Yaylak)
        document.querySelectorAll('#screen-yaylak .info-hotspot').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openInfo('yaylak', id);
            });
        });

        // Görsel İçi Hotspotlar (Kışlak)
        document.querySelectorAll('#screen-kislak .info-hotspot').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openInfo('kislak', id);
            });
        });

        // Bilgi Kartı Kapatma Butonları
        document.querySelectorAll('#screen-yaylak .btn-popover-close, #screen-yaylak .btn-popover-ok').forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                closeInfo('yaylak');
            });
        });

        document.querySelectorAll('#screen-kislak .btn-popover-close, #screen-kislak .btn-popover-ok').forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                closeInfo('kislak');
            });
        });

        // Karar Seçenekleri
        DOM.btnOptYaylak.addEventListener('click', () => handleDecision('yaylak'));
        DOM.btnOptKislak.addEventListener('click', () => handleDecision('kislak'));

        // Karar Tekrar Dene
        DOM.btnRetryDecision.addEventListener('click', () => {
            playSound('click');
            resetDecisionOptions();
        });

        // Göçü Başlat
        DOM.btnStartMigration.addEventListener('click', startMigration);

        // Göç -> Sonuç Ekranı
        DOM.btnToResult.addEventListener('click', () => {
            playSound('finish');
            notifySCORMCompletion();
            showScreen('screen-result');
        });

        // Sonuç Ekranı Butonları
        DOM.btnRestartActivity.addEventListener('click', resetActivity);
        DOM.btnReturnHome.addEventListener('click', () => {
            playSound('click');
            notifySCORMCompletion();
            showScreen('screen-home');
        });

        // Klavye ile Kısayollar (Escape ile popover kapatma)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeInfo('yaylak');
                closeInfo('kislak');
            }
        });
    }

    // ==========================================================================
    // 12. Başlatma (Init)
    // ==========================================================================
    function init() {
        setupEventListeners();
        showScreen('screen-home');
    }

    // DOM hazır olduğunda başlat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
