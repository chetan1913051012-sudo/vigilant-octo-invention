import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, LogIn, AlertCircle } from 'lucide-react';
import { db, isFirebaseConfigured } from './firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Local Storage Key
const STUDENTS_KEY = 'classX_students';

interface Student {
  id: string;
  studentId: string;
  password: string;
  name: string;
}

export default function StudentLogin() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!studentId || !password) {
      setError('Please enter both Student ID and Password');
      setLoading(false);
      return;
    }

    try {
      let studentFound = false;
      let studentName = '';

      if (isFirebaseConfigured()) {
        // Firebase mode
        const q = query(
          collection(db, 'students'),
          where('studentId', '==', studentId),
          where('password', '==', password)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          studentFound = true;
          studentName = snapshot.docs[0].data().name;
        }
      } else {
        // Local storage mode
        const savedStudents = localStorage.getItem(STUDENTS_KEY);
        if (savedStudents) {
          const students: Student[] = JSON.parse(savedStudents);
          const student = students.find(
            s => s.studentId === studentId && s.password === password
          );
          if (student) {
            studentFound = true;
            studentName = student.name;
          }
        }
      }

      if (studentFound) {
        // Store student info in session
        sessionStorage.setItem('studentId', studentId);
        sessionStorage.setItem('studentName', studentName);
        navigate('/student/dashboard');
      } else {
        setError('Invalid Student ID or Password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Student Login</h1>
            <p className="text-blue-100 mt-1">Access your photos and videos</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your Student ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Logging in...'
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login
                </>
              )}
            </button>

            <div className="text-center pt-4 border-t">
              <p className="text-gray-500 text-sm">
                Don't have login credentials?<br />
                Contact your class admin.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
