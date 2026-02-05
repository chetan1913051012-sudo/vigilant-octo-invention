import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Image, LogOut, Plus, Trash2, Edit, Search, 
  Upload, Video, X, Save, AlertTriangle, ExternalLink, Database
} from 'lucide-react';
import { db, storage, isFirebaseConfigured } from './firebase-config';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Student {
  id: string;
  studentId: string;
  password: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  email: string;
  phone: string;
}

interface Media {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'photo' | 'video';
  studentId: string;
  uploadedAt: string;
  fileName: string;
}

// Local Storage Keys
const STUDENTS_KEY = 'classX_students';
const MEDIA_KEY = 'classX_media';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'students' | 'media'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  const [studentForm, setStudentForm] = useState({
    studentId: '',
    password: '',
    name: '',
    rollNumber: '',
    class: 'X',
    section: 'A',
    email: '',
    phone: ''
  });

  const [mediaForm, setMediaForm] = useState({
    title: '',
    description: '',
    studentId: '',
    file: null as File | null
  });

  useEffect(() => {
    const configured = isFirebaseConfigured();
    
    if (!configured) {
      // Use localStorage as fallback for testing
      setFirebaseReady(false);
      setUsingLocalStorage(true);
      const savedStudents = localStorage.getItem(STUDENTS_KEY);
      const savedMedia = localStorage.getItem(MEDIA_KEY);
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedMedia) setMedia(JSON.parse(savedMedia));
      return;
    }

    setFirebaseReady(true);
    setUsingLocalStorage(false);

    const studentsQuery = query(collection(db, 'students'), orderBy('name'));
    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData: Student[] = [];
      snapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studentsData);
    }, (error) => {
      console.error('Error fetching students:', error);
    });

    const mediaQuery = query(collection(db, 'media'), orderBy('uploadedAt', 'desc'));
    const unsubMedia = onSnapshot(mediaQuery, (snapshot) => {
      const mediaData: Media[] = [];
      snapshot.forEach((doc) => {
        mediaData.push({ id: doc.id, ...doc.data() } as Media);
      });
      setMedia(mediaData);
    }, (error) => {
      console.error('Error fetching media:', error);
    });

    return () => {
      unsubStudents();
      unsubMedia();
    };
  }, []);

  // Save to localStorage when data changes (only in local mode)
  useEffect(() => {
    if (usingLocalStorage) {
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
    }
  }, [students, usingLocalStorage]);

  useEffect(() => {
    if (usingLocalStorage) {
      localStorage.setItem(MEDIA_KEY, JSON.stringify(media));
    }
  }, [media, usingLocalStorage]);

  const handleLogout = () => {
    navigate('/');
  };

  const handleAddStudent = async () => {
    if (!studentForm.studentId || !studentForm.password || !studentForm.name) {
      alert('Please fill in Student ID, Password, and Name');
      return;
    }

    setLoading(true);
    
    if (usingLocalStorage) {
      // Local storage mode
      if (editingStudent) {
        setStudents(students.map(s => 
          s.id === editingStudent.id 
            ? { ...s, ...studentForm }
            : s
        ));
      } else {
        const newStudent: Student = {
          id: Date.now().toString(),
          ...studentForm
        };
        setStudents([...students, newStudent]);
      }
      resetStudentForm();
      setLoading(false);
      return;
    }

    // Firebase mode
    try {
      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), studentForm);
      } else {
        await addDoc(collection(db, 'students'), studentForm);
      }
      resetStudentForm();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student. Check console for details.');
    }
    setLoading(false);
  };

  const handleDeleteStudent = async (student: Student) => {
    if (confirm(`Delete student ${student.name}?`)) {
      if (usingLocalStorage) {
        setStudents(students.filter(s => s.id !== student.id));
        return;
      }
      
      try {
        await deleteDoc(doc(db, 'students', student.id));
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      studentId: student.studentId,
      password: student.password,
      name: student.name,
      rollNumber: student.rollNumber,
      class: student.class,
      section: student.section,
      email: student.email,
      phone: student.phone
    });
    setShowStudentForm(true);
  };

  const resetStudentForm = () => {
    setStudentForm({
      studentId: '',
      password: '',
      name: '',
      rollNumber: '',
      class: 'X',
      section: 'A',
      email: '',
      phone: ''
    });
    setEditingStudent(null);
    setShowStudentForm(false);
  };

  const handleUploadMedia = async () => {
    if (!mediaForm.file || !mediaForm.title || !mediaForm.studentId) {
      alert('Please fill in all fields and select a file');
      return;
    }

    setLoading(true);

    if (usingLocalStorage) {
      // Local storage mode - convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const newMedia: Media = {
          id: Date.now().toString(),
          title: mediaForm.title,
          description: mediaForm.description,
          url: reader.result as string,
          type: mediaForm.file!.type.startsWith('video') ? 'video' : 'photo',
          studentId: mediaForm.studentId,
          uploadedAt: new Date().toISOString(),
          fileName: mediaForm.file!.name
        };
        setMedia([newMedia, ...media]);
        setMediaForm({ title: '', description: '', studentId: '', file: null });
        setShowMediaForm(false);
        setLoading(false);
      };
      reader.readAsDataURL(mediaForm.file);
      return;
    }

    // Firebase mode
    try {
      const fileName = `${Date.now()}_${mediaForm.file.name}`;
      const storageRef = ref(storage, `media/${fileName}`);
      await uploadBytes(storageRef, mediaForm.file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'media'), {
        title: mediaForm.title,
        description: mediaForm.description,
        url,
        type: mediaForm.file.type.startsWith('video') ? 'video' : 'photo',
        studentId: mediaForm.studentId,
        uploadedAt: new Date().toISOString(),
        fileName
      });

      setMediaForm({ title: '', description: '', studentId: '', file: null });
      setShowMediaForm(false);
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Error uploading media. Check console for details.');
    }
    setLoading(false);
  };

  const handleDeleteMedia = async (item: Media) => {
    if (confirm(`Delete ${item.title}?`)) {
      if (usingLocalStorage) {
        setMedia(media.filter(m => m.id !== item.id));
        return;
      }

      try {
        await deleteDoc(doc(db, 'media', item.id));
        const storageRef = ref(storage, `media/${item.fileName}`);
        await deleteObject(storageRef).catch(() => {});
      } catch (error) {
        console.error('Error deleting media:', error);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            {usingLocalStorage && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Database className="w-4 h-4" />
                <span>Local Mode - Data stored in browser only</span>
              </div>
            )}
            {firebaseReady && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Database className="w-4 h-4" />
                <span>Firebase Connected - Real-time sync enabled</span>
              </div>
            )}
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

      {/* Local Storage Warning Banner */}
      {usingLocalStorage && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Testing Mode (Local Storage)</p>
                <p className="text-amber-700">
                  Data is stored in your browser only. To enable real-time sync across all devices, 
                  <a 
                    href="https://console.firebase.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 ml-1 text-amber-900 underline hover:no-underline"
                  >
                    set up Firebase <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'students' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'media' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Image className="w-5 h-5" />
            Media ({media.length})
          </button>
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowStudentForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Plus className="w-5 h-5" />
                Add Student
              </button>
            </div>

            {/* Student Form Modal */}
            {showStudentForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">
                      {editingStudent ? 'Edit Student' : 'Add New Student'}
                    </h3>
                    <button onClick={resetStudentForm} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                        <input
                          type="text"
                          value={studentForm.studentId}
                          onChange={(e) => setStudentForm({...studentForm, studentId: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., STU001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <input
                          type="text"
                          value={studentForm.password}
                          onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Student password"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Student full name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                        <input
                          type="text"
                          value={studentForm.rollNumber}
                          onChange={(e) => setStudentForm({...studentForm, rollNumber: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <input
                          type="text"
                          value={studentForm.class}
                          onChange={(e) => setStudentForm({...studentForm, class: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="X"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <input
                          type="text"
                          value={studentForm.section}
                          onChange={(e) => setStudentForm({...studentForm, section: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="A"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={studentForm.email}
                          onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="student@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={studentForm.phone}
                          onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleAddStudent}
                      disabled={loading}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Student ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Password</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Roll No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No students found. Add your first student!
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-indigo-600">{student.studentId}</td>
                        <td className="px-4 py-3">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{student.password}</code>
                        </td>
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3">{student.rollNumber}</td>
                        <td className="px-4 py-3">{student.class}-{student.section}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>{student.email}</div>
                          <div className="text-gray-500">{student.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditStudent(student)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Uploaded Media</h2>
              <button
                onClick={() => setShowMediaForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Upload className="w-5 h-5" />
                Upload Media
              </button>
            </div>

            {/* Media Form Modal */}
            {showMediaForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Upload Media</h3>
                    <button onClick={() => setShowMediaForm(false)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={mediaForm.title}
                        onChange={(e) => setMediaForm({...mediaForm, title: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Media title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={mediaForm.description}
                        onChange={(e) => setMediaForm({...mediaForm, description: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional description"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Student *</label>
                      <select
                        value={mediaForm.studentId}
                        onChange={(e) => setMediaForm({...mediaForm, studentId: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select a student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.studentId}>
                            {student.name} ({student.studentId})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">File (Photo or Video) *</label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setMediaForm({...mediaForm, file: e.target.files?.[0] || null})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <button
                      onClick={handleUploadMedia}
                      disabled={loading}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="w-5 h-5" />
                      {loading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Media Grid */}
            {media.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No media uploaded yet. Upload your first photo or video!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((item) => (
                  <div key={item.id} className="border rounded-lg overflow-hidden group">
                    <div className="relative aspect-video bg-gray-100">
                      {item.type === 'photo' ? (
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.url} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-2 left-2">
                        {item.type === 'video' && (
                          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMedia(item)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium truncate">{item.title}</h4>
                      <p className="text-sm text-gray-500">Student: {item.studentId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
