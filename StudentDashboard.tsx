import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Image, Video, Filter, Database } from 'lucide-react';
import { db, isFirebaseConfigured } from './firebase-config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import MediaModal from './MediaModal';

// Local Storage Key
const MEDIA_KEY = 'classX_media';

interface Media {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'photo' | 'video';
  studentId: string;
  uploadedAt: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [media, setMedia] = useState<Media[]>([]);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  const studentId = sessionStorage.getItem('studentId');
  const studentName = sessionStorage.getItem('studentName');

  useEffect(() => {
    if (!studentId) {
      navigate('/student/login');
      return;
    }

    if (isFirebaseConfigured()) {
      // Firebase mode
      setUsingLocalStorage(false);
      const mediaQuery = query(
        collection(db, 'media'),
        where('studentId', '==', studentId),
        orderBy('uploadedAt', 'desc')
      );

      const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
        const mediaData: Media[] = [];
        snapshot.forEach((doc) => {
          mediaData.push({ id: doc.id, ...doc.data() } as Media);
        });
        setMedia(mediaData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching media:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Local storage mode
      setUsingLocalStorage(true);
      const savedMedia = localStorage.getItem(MEDIA_KEY);
      if (savedMedia) {
        const allMedia: Media[] = JSON.parse(savedMedia);
        const studentMedia = allMedia.filter(m => m.studentId === studentId);
        setMedia(studentMedia);
      }
      setLoading(false);

      // Set up interval to check for updates in local storage
      const interval = setInterval(() => {
        const savedMedia = localStorage.getItem(MEDIA_KEY);
        if (savedMedia) {
          const allMedia: Media[] = JSON.parse(savedMedia);
          const studentMedia = allMedia.filter(m => m.studentId === studentId);
          setMedia(studentMedia);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [studentId, navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('studentId');
    sessionStorage.removeItem('studentName');
    navigate('/');
  };

  const filteredMedia = media.filter(m => filter === 'all' || m.type === filter);
  const photoCount = media.filter(m => m.type === 'photo').length;
  const videoCount = media.filter(m => m.type === 'video').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {studentName || 'Student'}!</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Student ID: {studentId}</span>
              {usingLocalStorage && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Database className="w-4 h-4" />
                  Local Mode
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Image className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{photoCount}</p>
              <p className="text-gray-500">Photos</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{videoCount}</p>
              <p className="text-gray-500">Videos</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{media.length}</p>
              <p className="text-gray-500">Total Media</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({media.length})
            </button>
            <button
              onClick={() => setFilter('photo')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                filter === 'photo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Image className="w-4 h-4" />
              Photos ({photoCount})
            </button>
            <button
              onClick={() => setFilter('video')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                filter === 'video'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Video className="w-4 h-4" />
              Videos ({videoCount})
            </button>
          </div>
        </div>

        {/* Media Grid */}
        {filteredMedia.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <Image className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Media Found</h3>
            <p className="text-gray-500">
              {media.length === 0
                ? "Your admin hasn't uploaded any photos or videos for you yet."
                : "No media matches your current filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="bg-white rounded-xl shadow overflow-hidden cursor-pointer hover:shadow-lg transition group"
              >
                <div className="relative aspect-video bg-gray-100">
                  {item.type === 'photo' ? (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === 'photo' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-purple-500 text-white'
                    }`}>
                      {item.type === 'photo' ? 'Photo' : 'Video'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 truncate">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 truncate mt-1">{item.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
