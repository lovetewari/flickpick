// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SwipeCard from '@/components/SwipeCard';

const movie = {
  id: 603, title: 'The Matrix', year: 1999, genre: ['Action', 'Sci-Fi'], rating: 8.2,
  poster: 'https://img.example/matrix.jpg', desc: 'A hacker discovers reality.',
  duration: '2h 16m', ott: ['Netflix'], type: 'movie', seasons: 0, episodes: 0, status: '', network: '',
};
const series = {
  id: 100001396, title: 'Breaking Bad', year: 2008, genre: ['Drama'], rating: 8.9,
  poster: 'https://img.example/bb.jpg', desc: 'Chemistry teacher turns kingpin.',
  duration: '5 Seasons', ott: ['Netflix'], type: 'series', seasons: 5, episodes: 62,
  status: 'Ended', network: 'AMC',
};

describe('SwipeCard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders movie metadata (title, year, runtime, rating, platforms)', () => {
    render(<SwipeCard item={movie} isTop onSwipe={() => {}} />);
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('2h 16m')).toBeInTheDocument();
    expect(screen.getByText('8.2')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders series-specific metadata (seasons/episodes)', () => {
    render(<SwipeCard item={series} isTop onSwipe={() => {}} />);
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.getByText(/5S/)).toBeInTheDocument();
    expect(screen.getByText(/62 Ep/)).toBeInTheDocument();
  });

  it('fires onSwipe("right") after the like button animation', () => {
    const onSwipe = vi.fn();
    render(<SwipeCard item={movie} isTop onSwipe={onSwipe} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]); // like (♥) is the last button
    expect(onSwipe).not.toHaveBeenCalled();       // waits for exit animation
    act(() => vi.advanceTimersByTime(250));
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('fires onSwipe("left") for the nope button', () => {
    const onSwipe = vi.fn();
    render(<SwipeCard item={movie} isTop onSwipe={onSwipe} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 2]); // nope (✕)
    act(() => vi.advanceTimersByTime(250));
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('ignores further swipes once the card is gone (no double-fire)', () => {
    const onSwipe = vi.fn();
    render(<SwipeCard item={movie} isTop onSwipe={onSwipe} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    fireEvent.click(buttons[buttons.length - 1]);
    fireEvent.click(buttons[buttons.length - 2]);
    act(() => vi.advanceTimersByTime(500));
    expect(onSwipe).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons on non-top (stacked) cards', () => {
    render(<SwipeCard item={movie} isTop={false} onSwipe={() => {}} />);
    expect(screen.queryAllByRole('button').length).toBe(0);
  });
});
