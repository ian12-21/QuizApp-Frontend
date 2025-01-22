import { TestBed } from '@angular/core/testing';
import { QuizService } from './quizContracts.service';
import { PLATFORM_ID } from '@angular/core';
import { ethers } from 'ethers';

describe('QuizService', () => {
  let service: QuizService;
  let mockEthereum: any;

  beforeEach(() => {
    // Mock window.ethereum
    mockEthereum = {
      request: jasmine.createSpy('request'),
      on: jasmine.createSpy('on'),
      removeListener: jasmine.createSpy('removeListener')
    };

    // Create a spy for Math.random to control PIN generation
    spyOn(Math, 'random').and.returnValue(0.5);

    // Mock window object
    (window as any).ethereum = mockEthereum;

    TestBed.configureTestingModule({
      providers: [
        QuizService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(QuizService);
  });

  afterEach(() => {
    // Clean up
    delete (window as any).ethereum;
  });

  describe('PIN Generation and Validation', () => {
    it('should generate a 6-digit PIN', () => {
      const pin = service.generatePin();
      expect(pin.length).toBe(6);
      expect(Number(pin)).toBeGreaterThanOrEqual(100000);
      expect(Number(pin)).toBeLessThanOrEqual(999999);
    });

    it('should generate numeric PINs only', () => {
      for (let i = 0; i < 50; i++) {
        const pin = service.generatePin();
        expect(/^\d+$/.test(pin)).toBeTrue();
      }
    });

    it('should never generate PINs starting with 0', () => {
      for (let i = 0; i < 50; i++) {
        const pin = service.generatePin();
        expect(pin[0]).not.toBe('0');
      }
    });

    it('should generate unique PINs across multiple calls', () => {
      const pins = new Set<string>();
      for (let i = 0; i < 100; i++) {
        pins.add(service.generatePin());
      }
      expect(pins.size).toBe(100); // All PINs should be unique
    });

    it('should handle PIN collisions by generating new PIN', async () => {
      // Force Math.random to return the same value multiple times
      (Math.random as jasmine.Spy).and.returnValue(0.5);
      
      // Create first quiz with PIN
      const firstPin = service.generatePin();
      (service as any).quizPins.set(firstPin, {
        quizAddress: '0x123',
        answersString: '123',
        playerAddresses: []
      });
      
      // Try to generate another PIN (should be different despite same random value)
      const secondPin = service.generatePin();
      expect(secondPin).not.toBe(firstPin);
      
      // Verify both PINs are valid 6-digit numbers
      expect(firstPin.length).toBe(6);
      expect(secondPin.length).toBe(6);
      expect(/^\d+$/.test(firstPin)).toBeTrue();
      expect(/^\d+$/.test(secondPin)).toBeTrue();
    });

    it('should handle multiple consecutive PIN collisions', () => {
      // Force Math.random to return same value multiple times
      (Math.random as jasmine.Spy).and.returnValue(0.5);
      
      // Create multiple quizzes with potentially colliding PINs
      const pins = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const pin = service.generatePin();
        (service as any).quizPins.set(pin, {
          quizAddress: `0x${i}`,
          answersString: '123',
          playerAddresses: []
        });
        pins.add(pin);
      }
      
      // All PINs should still be unique despite same random value
      expect(pins.size).toBe(10);
    });

    it('should handle edge cases in PIN generation', () => {
      // Test with Math.random returning edge values
      const testCases = [
        { random: 0, expectedLength: 6 },
        { random: 0.999999, expectedLength: 6 },
        { random: 0.1, expectedLength: 6 },
        { random: 0.9, expectedLength: 6 }
      ];

      testCases.forEach(({ random, expectedLength }) => {
        (Math.random as jasmine.Spy).and.returnValue(random);
        const pin = service.generatePin();
        expect(pin.length).toBe(expectedLength);
        expect(Number(pin)).toBeGreaterThanOrEqual(100000);
        expect(Number(pin)).toBeLessThanOrEqual(999999);
      });
    });
  });

  describe('Quiz Management', () => {
    const mockQuiz = {
      quizAddress: '0x123',
      answersString: '123',
      playerAddresses: []
    };

    it('should store quiz data with PIN', async () => {
      const pin = service.generatePin();
      (service as any).quizPins.set(pin, mockQuiz);

      const retrievedQuiz = await service.getQuizByPin(pin);
      expect(retrievedQuiz).toEqual(mockQuiz);
    });

    it('should throw error when quiz not found', async () => {
      await expectAsync(
        service.getQuizByPin('999999')
      ).toBeRejectedWithError('Quiz not found');
    });

    it('should create quiz with correct data', async () => {
      const mockQuestions = [
        {
          question: 'Test Question',
          answers: ['A', 'B', 'C'],
          correctAnswer: 1
        }
      ];

      // Mock the ethereum provider and contract
      const mockProvider = {
        getSigner: jasmine.createSpy('getSigner').and.returnValue(Promise.resolve({}))
      };
      const mockFactory = {
        createQuiz: jasmine.createSpy('createQuiz').and.returnValue(
          Promise.resolve({
            wait: () => Promise.resolve({
              logs: [{
                topics: ['QuizCreated'],
                args: ['0x456']
              }]
            })
          })
        ),
        interface: {
          parseLog: () => ({
            name: 'QuizCreated',
            args: ['0x456']
          })
        }
      };

      (service as any).provider = mockProvider;
      (service as any).factory = mockFactory;

      const result = await service.createQuiz(mockQuestions);
      
      expect(result.quizAddress).toBeTruthy();
      expect(result.pin).toBeTruthy();
      expect(Number(result.pin)).toBeGreaterThanOrEqual(100000);
      expect(Number(result.pin)).toBeLessThanOrEqual(999999);
    });
  });
});
