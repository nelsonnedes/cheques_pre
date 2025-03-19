// Mock do Firebase
const mockAuth = {
    currentUser: {
        uid: 'test-user-id',
        email: 'test@example.com'
    },
    onAuthStateChanged: jest.fn()
};

const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    onSnapshot: jest.fn()
};

// Mock das funções do Firebase
jest.mock('../js/firebase-config.js', () => ({
    auth: mockAuth,
    db: mockFirestore
}));

// Mock do localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock de funções do DOM
global.fetch = jest.fn();
global.document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
        nodeName: 'BODY',
        ownerDocument: document
    }
});

// Limpar mocks após cada teste
afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

// Helpers para testes
global.setupTestUser = () => {
    mockAuth.currentUser = {
        uid: 'test-user-id',
        email: 'test@example.com'
    };
};

global.clearTestUser = () => {
    mockAuth.currentUser = null;
}; 