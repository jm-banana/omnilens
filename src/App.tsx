import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraScanner } from './components/CameraScanner';
import { DeckViewer } from './components/DeckViewer';
import { StudyFlipMode } from './components/StudyFlipMode';
import { QuizMode } from './components/QuizMode';
import { ScanReviewModal } from './components/ScanReviewModal';
import { NewCardModal } from './components/NewCardModal';
import { Deck, Flashcard, ReviewRating, ScanResult } from './types';
import { filterCardsDue, calculateDeckAccuracy } from './utils/srs';
import { INITIAL_DECKS } from './data/initialDecks';
import { auth, googleProvider, db, validateFirestoreConnection } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'decks' | 'study' | 'quiz'>('decks');
  const [decks, setDecks] = useState<Deck[]>(INITIAL_DECKS);
  const [selectedDeckForStudy, setSelectedDeckForStudy] = useState<Deck | null>(INITIAL_DECKS[0] || null);
  const [selectedDeckForQuiz, setSelectedDeckForQuiz] = useState<Deck | null>(INITIAL_DECKS[0] || null);
  const [activeScanResult, setActiveScanResult] = useState<ScanResult | null>(null);
  const [scannedImageSrc, setScannedImageSrc] = useState<string | null>(null);
  const [newCardTargetDeck, setNewCardTargetDeck] = useState<Deck | null>(null);
  const [isAiConnected, setIsAiConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);

  // Load decks, health and Firebase on initial render
  useEffect(() => {
    // Check URL parameters (e.g. ?autostart=1 or ?tab=study)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'scanner' || tabParam === 'decks' || tabParam === 'study' || tabParam === 'quiz') {
      setActiveTab(tabParam);
    }

    fetchDecks();
    checkHealth();

    // Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Test Firestore connectivity
    validateFirestoreConnection().then(setFirestoreConnected);

    return () => unsubscribe();
  }, []);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/decks');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.decks) && data.decks.length > 0) {
          setDecks(data.decks);
          if (!selectedDeckForStudy) setSelectedDeckForStudy(data.decks[0]);
          if (!selectedDeckForQuiz) setSelectedDeckForQuiz(data.decks[0]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch decks from server, using local fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setIsAiConnected(Boolean(data.hasApiKey));
      }
    } catch {
      setIsAiConnected(false);
    }
  };

  // When a camera/document scan finishes
  const handleScanComplete = (result: ScanResult, imageSrc: string) => {
    setActiveScanResult(result);
    setScannedImageSrc(imageSrc);
  };

  // Save new deck created from a scan
  const handleSaveScannedDeck = async (
    deckData: {
      title: string;
      subject: string;
      description: string;
      tags: string[];
      cards: Array<Omit<Flashcard, 'repetitions' | 'interval' | 'easeFactor' | 'nextReviewDate'>>;
      scanImageUrl?: string;
    },
    startStudy: boolean = false
  ) => {
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deckData),
      });

      if (!res.ok) throw new Error('Failed to save deck');
      const data = await res.json();
      const savedDeck: Deck = data.deck;

      setDecks((prev) => [savedDeck, ...prev]);
      setActiveScanResult(null);
      setScannedImageSrc(null);

      // Async Firestore Cloud Sync
      if (firestoreConnected) {
        setDoc(doc(db, 'decks', savedDeck.id), {
          id: savedDeck.id,
          title: savedDeck.title,
          subject: savedDeck.subject,
          description: savedDeck.description || '',
          createdAt: savedDeck.createdAt,
          updatedAt: savedDeck.updatedAt,
          ownerId: user?.uid || 'guest',
        }).catch((err) => console.warn('Firestore sync note:', err));
      }

      if (startStudy) {
        setSelectedDeckForStudy(savedDeck);
        setActiveTab('study');
      } else {
        setActiveTab('decks');
      }
    } catch (err: any) {
      console.error('Save deck error:', err);
    }
  };

  // Review card with Spaced Repetition rating
  const handleReviewCard = async (deckId: string, cardId: string, rating: ReviewRating) => {
    try {
      const res = await fetch(`/api/decks/${deckId}/cards/${cardId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedDeck = data.deck;
        setDecks((prev) => prev.map((d) => (d.id === deckId ? updatedDeck : d)));
        if (selectedDeckForStudy?.id === deckId) {
          setSelectedDeckForStudy(updatedDeck);
        }

        // Async Firestore update
        if (firestoreConnected) {
          setDoc(doc(db, 'decks', deckId), {
            id: updatedDeck.id,
            title: updatedDeck.title,
            subject: updatedDeck.subject,
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Review card error:', err);
    }
  };

  // Delete Deck
  const handleDeleteDeck = async (deckId: string) => {
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: 'DELETE' });
      if (res.ok) {
        setDecks((prev) => prev.filter((d) => d.id !== deckId));
        if (selectedDeckForStudy?.id === deckId) {
          setSelectedDeckForStudy(decks.find((d) => d.id !== deckId) || null);
        }

        if (firestoreConnected) {
          deleteDoc(doc(db, 'decks', deckId)).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Delete deck error:', err);
    }
  };

  // Add Card Manually
  const handleSaveNewCard = async (deckId: string, cardData: Partial<Flashcard>) => {
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card: cardData }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedDeck = data.deck;
        setDecks((prev) => prev.map((d) => (d.id === deckId ? updatedDeck : d)));
        if (selectedDeckForStudy?.id === deckId) {
          setSelectedDeckForStudy(updatedDeck);
        }
      }
    } catch (err) {
      console.error('Add card error:', err);
    }
  };

  // Global calculations
  const allCards = decks.flatMap((d) => d.cards || []);
  const dueCards = filterCardsDue(allCards);
  const avgAccuracy = calculateDeckAccuracy(allCards);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCards={allCards.length}
        dueCards={dueCards.length}
        avgAccuracy={avgAccuracy}
        isAiConnected={isAiConnected}
        user={user}
        firestoreConnected={firestoreConnected}
        onSignIn={async () => {
          try {
            await signInWithPopup(auth, googleProvider);
          } catch (err: any) {
            console.warn('Google sign-in popup closed or cancelled:', err);
          }
        }}
        onSignOut={async () => {
          try {
            await signOut(auth);
          } catch (err) {
            console.error('Sign out error:', err);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'scanner' && (
          <CameraScanner onScanComplete={handleScanComplete} />
        )}

        {activeTab === 'decks' && (
          <DeckViewer
            decks={decks}
            onSelectDeckForStudy={(deck) => {
              setSelectedDeckForStudy(deck);
              setActiveTab('study');
            }}
            onSelectDeckForQuiz={(deck) => {
              setSelectedDeckForQuiz(deck);
              setActiveTab('quiz');
            }}
            onDeleteDeck={handleDeleteDeck}
            onOpenScanner={() => setActiveTab('scanner')}
            onOpenNewCardModal={(deck) => setNewCardTargetDeck(deck)}
          />
        )}

        {activeTab === 'study' && (
          <StudyFlipMode
            deck={selectedDeckForStudy || decks[0]}
            onReviewCard={handleReviewCard}
            onExit={() => setActiveTab('decks')}
            onSelectAnotherDeck={() => setActiveTab('decks')}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizMode
            decks={decks}
            initialDeckId={selectedDeckForQuiz?.id}
            onExit={() => setActiveTab('decks')}
          />
        )}
      </main>

      {/* Scan Review Modal */}
      {activeScanResult && scannedImageSrc && (
        <ScanReviewModal
          scanResult={activeScanResult}
          imageSrc={scannedImageSrc}
          onSaveDeck={handleSaveScannedDeck}
          onClose={() => {
            setActiveScanResult(null);
            setScannedImageSrc(null);
          }}
        />
      )}

      {/* Manual New Card Modal */}
      {newCardTargetDeck && (
        <NewCardModal
          deck={newCardTargetDeck}
          onSaveCard={handleSaveNewCard}
          onClose={() => setNewCardTargetDeck(null)}
        />
      )}
    </div>
  );
}
