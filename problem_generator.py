#!/usr/bin/env python3

from __future__ import print_function

import errno
import os
import shutil
import sys
from subprocess import call

from collections import defaultdict

# VERSION SHOULD BE Python 3.6+

class NoClosingBraceError(Exception):
	pass

def find_closure(text, begin_idx):
	"""Given a piece of text and the index of an opening brace, return the index
	of its closing brace.
	"""
	# print(f"Calling find_closure(\ntext = \n{text}\nbegin_idx = \n{begin_idx}\n!")
	curly_depth = 0

	text_after = text[begin_idx:]

	for idx, char in enumerate(text_after):
		if char == "{" and text_after[idx-1:idx+1] != "\\{":
			curly_depth += 1
		elif char == "}" and text_after[idx-1:idx+1] != "\\}":
			curly_depth -= 1
			if curly_depth == 0:
				end_idx = idx + begin_idx
				return end_idx
	
	# If we're here, we couldn't find a closing brace.
	raise NoClosingBraceError
	

def gen_problems(input_file, verbose=False):
	"""Given an input file, parse it into individual problems.

	The beginning of a problem found with its tagged block, and the end with 
	that blocks closing braces.
	"""

	with open("{}.tex".format(input_file), 'r') as f:
		contents = f.read()

	begin_prob = r"%\tagged{"
	begin_len  = len(begin_prob)

	# end_prob   = r"}%}"
	# end_len    = len(end_prob)
	while begin_prob in contents:

		begin_tags_idx = contents.index(begin_prob)

		begin_tags_brace_idx = begin_tags_idx + begin_len - 1

		try:
			end_tags_brace_idx = find_closure(contents, begin_tags_brace_idx)
		except NoClosingBraceError:
			problematic_bit = text[tags_open_brace_idx:][:1000]
			error_statement = f"\nNo closing brace found for the _first_ part of the tagged block beginning\n{problematic_bit}"
			raise NoClosingBraceError(error_statement)

		
		begin_prob_brace_idx = end_tags_brace_idx + 1
		assert contents[begin_prob_brace_idx] == '{', \
			r"Tags formatting seems wrong. Should read '%\tagged{ etc }{' and so on!"

		try:
			end_prob_brace_idx = find_closure(contents, begin_prob_brace_idx)
		except NoClosingBraceError:
			error_statement = f"\nNo closing brace found for the _second_ part of the tagged block beginning\n{contents[begin_tags_brace_idx:][:1000]}"
			raise NoClosingBraceError(error_statement)	

		end_prob_idx = end_prob_brace_idx + 1

		problem  = contents[begin_tags_idx:end_prob_idx]
		contents = contents[end_prob_idx:]

		if any(line.strip() and line.lstrip()[0] != r'%' for line in problem.split('\n')):
			# Some line in the problem is not commented out.
			# Could also potentially remove comment lines.

			if verbose:
				ast = r"*"*13
				print(f"{ast}\n   PROBLEM   \n{ast}\n{problem}")
				print(f"{ast}\n     REST    \n{ast}\n{contents}")

			yield problem

def parse_problem(text, verbose=False):
	"""Given the complete problem, parse it into five pieces."""

	problem_dict = {'original':text}
	# `problem_dict['original']` is the complete string passed.

	########## Parse file ##########

	tags_begin = r"%\tagged{"
	tags_open_brace_idx = text.index(tags_begin) + len(tags_begin) - 1
	try:
		tags_close_brace_idx = find_closure(text, tags_open_brace_idx)
	except NoClosingBraceError:
		problematic_bit = text[tags_open_brace_idx:][:1000]
		error_statement = f"\nNo closing brace found for the _first_ part of the tagged block beginning\n{problematic_bit}"
		raise NoClosingBraceError(error_statement)
	problem_dict['tags'] = text[:tags_close_brace_idx+1]
	# `problem_dict['tags']` is the tagged block, e.g., "\tagged{...}"
	assert text[tags_close_brace_idx+1] == '{', r"Tags formatting seems wrong. Should read %\tagged{...}{problem_content}!"

	text = text[tags_close_brace_idx+1:]
	# `text` is now everything after, starting with the opening brace `{`.
	
	if verbose:
		ast = r"*"*13
		print(f"{ast}\n     tags    \n{ast}\n{problem_dict['tags']}")
		# print(f"{ast}\n     rest    \n{ast}\n{text}")

	# Note that we'll drop everything before the `\begin{sagesilent}` block.

	sagesilent_begin = r"\begin{sagesilent}"
	sagesilent_begin_idx = text.index(sagesilent_begin)

	if verbose:
		ast = r"*"*13
		print(f"{ast}\n   dropping  \n{ast}\n{text[:sagesilent_begin_idx]}")
		# print(f"{ast}\n     rest    \n{ast}\n{text[sagesilent_begin_idx:]}")

	text = text[sagesilent_begin_idx:]
	# `text` is now without anything before the sagesilent block.

	sagesilent_end = r"\end{sagesilent}"
	sagesilent_end_idx = text.index(sagesilent_end) + len(sagesilent_end)
	problem_dict['sage'] = text[:sagesilent_end_idx]
	# `problem_dict['sage']` is the whole "\begin{sagesilent}...\end{sagesilent}" block.
	text = text[sagesilent_end_idx:]
	# `text` is now without sagesilent block.

	if verbose:
		ast = r"*"*14
		print(f"{ast}\n  sagesilent  \n{ast}\n{problem_dict['sage']}")
		# print(f"{ast}\n     rest     \n{ast}\n{text}")
	
	# THIS MAY NEED TO GO!
	text = remove_comments(text)
	# This is necessary in case there are commented out braces in the problem content.

	latexprob_begin = r"\latexProblemContent{"
	latexprob_begin_idx = text.index(latexprob_begin)
	problem_dict['middle'] = text[:latexprob_begin_idx]
	# `problem_dict['middle']` is everything between the sagesilent block and the problem content.
	text = text[latexprob_begin_idx:]
	# `text` is now without middle.

	if verbose:
		ast = r"*"*14
		print(f"{ast}\n    middle    \n{ast}\n{problem_dict['middle']}")
		# print(f"{ast}\n     rest     \n{ast}\n{text}")

	del problem_dict['middle']

	latexprob_open_brace_idx = len(latexprob_begin) - 1
	try:
		latexprob_close_brace_idx = find_closure(text, latexprob_open_brace_idx)
	except NoClosingBraceError:
		problematic_bit = text[latexprob_open_brace_idx:][:1000]
		error_statement = f"\nNo closing brace found for the \latexProblemContent block beginning\n{problematic_bit}"
		raise NoClosingBraceError(error_statement)

	latexprob_end_idx = latexprob_close_brace_idx + 1 # We don't want to include the `%}` here.
	problem_dict['latexproblem'] = text[:latexprob_end_idx]
	# `problem_dict['latexproblem'] is the whole "\latexProblemContent{...}" block.
	text = text[latexprob_end_idx:]
	# `text` is now without problem content.

	if verbose:
		ast = r"*"*14
		print(f"{ast}\n latexproblem \n{ast}\n{problem_dict['latexproblem']}")
		print(f"{ast}\n     rest     \n{ast}\n{text}")

	problem_dict['footer'] = text
	# `problem_dict['footer']` is everything after the problem content.

	del problem_dict['footer']

	return problem_dict

# def find_file_name(latex_problem):
# 	"""Given the `\latexProblemContent{...}` block, return the intended file name.


# 	"""
# 	input_begin = r"\input{"
# 	help_tex = r".HELP.tex"
# 	for line in latex_problem.splitlines():
# 		if help_tex in line:
# 			input_begin_idx = line.index(input_begin) + len(input_begin)
# 			input_end_idx   = line.index(help_tex)
# 			file_name = line[input_begin_idx:input_end_idx]
# 			break
# 	else:
# 		# If we're here, there was no `\input{_.HELP.tex}`.
# 		raise Exception(r"No file was input! Was the inputting of the help file commented out?")

# 	return file_name

def create_intermediate(problem_key, problem_dict, copies):

	preprocess_header = "\n".join([
		r"\documentclass{ximera}",
		r"\usepackage{PackageLoader}",
		r"\usepackage{sagetex}",
		r"\renewcommand{\latexProblemContent}[1]{#1}",
		# r"\renewcommand{\sqrt}[2][2]{(#2)^{\frac{1}{#1}}}",
		r"\renewcommand{\sqrt}[2][2]{\text{$(#1)$ root of $(#2)$}}",
		r"\renewenvironment{problem}{}{}",
		r"\renewenvironment{question}{}{}",
		r"\renewenvironment{exploration}{}{}",
		r"\renewenvironment{example}{}{}",
		r"\renewcommand{\answer}[2][]{#2}",
		r"\renewcommand{\choice}[2][]{\item #2}",
		r"\begin{document}",
		r"\input{Useful-Sage-Macros.tex}"])

	preprocess_footer = "\n".join( 
		[r"\end{document}"])

	intermediate_file = f"INTERMEDIATE_{problem_key}"

	one_sage_problem = "\n".join([problem_dict['sage'],problem_dict['latexproblem']])

	with open(f"{intermediate_file}.tex", 'w') as f:
		intermediate_contents = "\n".join([preprocess_header] 
										+ [one_sage_problem]*copies 
										+ [preprocess_footer])
		f.write(intermediate_contents)

def remove_comments(text, comment_char = r"%"):
	old_lines = text.split("\n")
	new_lines = []

	for line in old_lines:
		line_before, mid, line_after = line.partition(comment_char)
		new_lines.append(line_before)

	return "\n".join(new_lines)

# def create_help(problem_key):
# 	"""Create the help file if it doesn't exist."""
# 	help_tex = f"{problem_key}.HELP.tex"

# 	with open(help_tex,'a'):
# 		# This will open the help file in 'append mode', creating it if it doesn't exist.
# 		pass

def extract_replacements(file_name):
	"""Extract replacements from the .sagetex.sout file.
	"""
	with open(f"{file_name}.sagetex.sout", 'r') as f:
		sout_contents = f.readlines()

	ast = r"*"*10
	# print(f"{ast}\nSOUT:\n{ast}\n")
	# for line in sout_contents:
	# 	print(line,end="")

	replacements = []

	# print(f"{ast}\nLINES:\n{ast}\n")

	begin = r"\newlabel{@sageinline"
	begin_len = len(begin)
	end_braces = r"}{}{}{}{}}" + "\n"

	end_len = len(end_braces)
	for idx, line in enumerate(sout_contents):
		# print(line)
		# print(line[:21])

		if line[:begin_len] == begin:
			# print('success')
			next_line = sout_contents[idx+1]
			# print(next_line)
			# print(next_line[:-11])
			# print(next_line[-11:])
			assert next_line[-end_len:] == end_braces, f"Unexpected behavior in .sout!: {next_line[-end_len:]} is not {end_braces}"
			term = next_line[:-end_len]
			replacements.append(term)
	return replacements

def replace_sage(latex_problems, replacements):
	"""Replace instances of `\sage{...}` in each latex problem in 
	`latex_problems` with the provided `replacements` in order.
	"""
	# print("\n"*5)
	# print(latex_problems)
	# print("\n"*5)
	# print(replacements)
	# print("\n"*5)
	sage_begin = r"\sage{"
	sagestrmm_begin = r"\sagestrmm{"
	sagestr_begin = r"\sagestr{"
	begins = [sage_begin, sagestr_begin, sagestrmm_begin]

	for problem_idx, latex_problem in enumerate(latex_problems):
		while any(begin in latex_problem for begin in begins):
			begin_indices = [(begin,latex_problem.find(begin)) for begin in begins]
			begin_indices = [(begin, idx) for begin, idx in begin_indices if idx != -1]

			begin, begin_idx = min(begin_indices, key=lambda x: x[1]) # Get the (begin, idx) pair with the minimum idx.

			# Index of opening brace.
			begin_brace_idx = begin_idx + len(begin) - 1

			# Index of closing brace
			try:
				close_brace_idx = find_closure(latex_problem, begin_brace_idx)
			except NoClosingBraceError:
				error_statement = f"\nVery strange: No closing brace found for a \sage variable, beginning\n{latex_problem[begin_brace_idx:][:1000]}"
			
			end_idx = close_brace_idx + 1

			replacement = replacements.pop(0)

			text_start = r"\text{\texttt{"
			text_end   = r"}}"
			if replacement.startswith(text_start) and replacement.endswith(text_end):
				replacement = r"\text{" + replacement[len(text_start):-len(text_end)] + r"}" 

			if begin == sagestrmm_begin:
				replacement = r"\text{" + replacement + r"}"

			latex_problem = latex_problem[:begin_idx] + replacement + latex_problem[end_idx:]

		latex_problems[problem_idx] = latex_problem

	assert len(replacements) == 0, 'Not all replacements were used!'
	return latex_problems

def cleanup(intermediate_file):
	"""Delete files which are no longer needed."""
	itermediate_suffixes = [
		'.aux', 
		'.ids', 
		'.jax', 
		'.log', 
		'.oc', 
		'.out', 
		'.pdf', 
		'.tex', 
		'.sagetex.sage', 
		'.sagetex.sage.py', 
		'.sagetex.scmd', 
		'.sagetex.sout'
	]

	files_to_remove = [intermediate_file+suffix for suffix in itermediate_suffixes]

	for file in files_to_remove:
		os.remove(file)

def parse_tags(tags_string):
	left_brace = tags_string.index("{")
	right_brace = tags_string.index("}")
	stripped = tags_string[left_brace+1:right_brace]
	split = [tag.strip() for tag in stripped.split(',')]

	tag_dict = defaultdict(list)
	for tag in split:
		assert tag.count("@") == 1, f"Hmm, one of the tags looks funny (fix this!): \"{tag}\""
		left, right = tag.split("@")
		tag_dict[left].append(right)

	return tag_dict

def display_tags(tag_dict):
	s = ""
	for key, val_list in sorted(tag_dict.items()):
		s += f"% {key:10s}" + " : " + ", ".join(val_list) + "\n"
	return s

def create_file_name(tags_dict, verbose = False):
	fields = ['Topic', 'Type', 'File']
	for field in fields:
		l = len(tags_dict[field])
		assert l >= 1, f"No {field} given!"
		assert l <= 1, f"More than one {field} given: {tags_dict[field]}"

	# s = "-".join(tags_dict[field][0] for field in fields)
	s = f"{tags_dict['Topic'][0]}-{tags_dict['Type'][0]}-{tags_dict['File'][0]}"
	if verbose:
		print(f"Parsed the file name as: {s}")
	return s

def postprocessing():
	"""Does nothing for now."""
	pass
	# postprocess_header = r"""\documentclass{ximera}
	# \usepackage{PackageLoader}
	# \renewcommand{\latexProblemContent}[1]{#1}
	# \begin{document}
	# """

	# postprocess_footer = r"""\end{document}
	# """
	# final_file = f"{file_name}_FINAL"
	# with open(f"{final_file}.tex", 'w') as f:
	# 	f.write(final_contents)

	# pdflatex_command_final = f"pdflatex {final_file}.tex"
	# # pdflatex_command_final += ">/dev/null" # Redirect output to nowhere. (run quietly)
	# print(pdflatex_command_final)
	# os.system(pdflatex_command_final)
	# open_command_final = f"open {final_file}.pdf"
	# print(open_command_final)
	# os.system(open_command_final)

def has_help(latexProblem):
	help_start = r"\input{"
	help_end   = r".HELP.tex}"
		
	for line in latexProblem.split("\n"):
		line = line.strip()
		if line.startswith(help_start) and line.endswith(help_end):
			help_file_input = line[len(help_start):-1]
			return help_file_input
	
	return False
		# assert problem_dict['guided'],
		# 	"This problem is not a guided problem, but does not input a help file!"
	

def process_problem(problem_key, problem_dict, input_file, folder = "",
	copies_initially = 1000, final_copies = 500, quiet = False, verbose = False):

	intermediate_file = f"INTERMEDIATE_{problem_key}"

	parsed_tags = parse_tags(problem_dict['tags'])

	if verbose:
		for key, val in parsed_tags.items():
			print(f"key = {key}, val={val}")

	help_file_input = has_help(problem_dict['latexproblem'])
	if help_file_input:
		help_tex = f"{problem_key}.HELP.tex"
		assert help_file_input == help_tex, "You appear to be inputting the wrong help file!\n" \
											+ f"You're inputting {help_file_input} instead of {help_tex}."
		with open(help_tex,'a') as f:
			pass
	else:
		assert "Guided" in parsed_tags['Sub'], f"No file input in a non-guided problem: {problem_key}"
		help_tex = None

	create_intermediate(problem_key, problem_dict, copies_initially)
	# This will create the intermediate files, namely the help file and the file to run pdflatex on.

	########## Run pdflatex and sage ##########

	pdflatex_command = "pdflatex "
	pdflatex_options = []
	pdflatex_options.append(f"{intermediate_file}.tex")

	if quiet:
		pdflatex_options.append(r">/dev/null")
	
	pdflatex_command += " ".join(pdflatex_options) 
	print(pdflatex_command)
	os.system(pdflatex_command)

	##########

	sage_command = f"sage "
	sage_options = []
	sage_options.append(f"{intermediate_file}.sagetex.sage")

	if quiet:
		sage_options.append(r">/dev/null 2>&1") # Redirect output to nowhere. (run quietly)

	sage_command += " ".join(sage_options)
	print(sage_command)
	os.system(sage_command)

	########## Extract and make replacements ##########

	one_final_problem = problem_dict['latexproblem']
	problems = [one_final_problem] * copies_initially

	replacements = extract_replacements(intermediate_file)
	# Pull the list of sage replacements from the .sout file.

	final_problems = replace_sage(problems, replacements)
	# These are the \latexProblemContent{...} entries with the replacements made.

	final_problems = list(set(final_problems)) 
	# Removes duplicates.

	########## Put the finished problems together and cleanup ##########

	if len(final_problems) > final_copies:
		final_problems = final_problems[:final_copies]

	problem_separator = "\n\n" + "%"*22 + "\n\n"

	final_contents = display_tags(parsed_tags) + "\n"

	final_contents += "\n".join([
		r"\ProblemFileHeader{" + f"{len(final_problems)}" + r"}",
		r"\ifquestionPull",
		r"\ifproblemToFind"
	])
	final_contents += problem_separator.join(final_problems) 
	final_contents += "\n".join([
		r"\fi             %% end of \ifproblemToFind near top of file",
		r"\fi             %% end of \ifquestionCount near top of file",
		r"\ProblemFileFooter"
	])
	
	file_tex = f"{problem_key}.tex"
	with open(file_tex, 'w') as f:
		f.write(final_contents)

	cleanup(intermediate_file)

	if help_tex:
		if os.path.abspath(destination_folder) != os.path.abspath(os.getcwd()):
			print(f"Removing (local) help file: {help_tex}")
			os.remove(help_tex)
		else:
			print(f"Not removing help file ({help_tex}), since the destination is the cwd.")

	return (file_tex, help_tex)

def preprocess_file(archetype_file, quiet = False, verbose = False):
	"""Pull the problems out of the file, ensuring there are no (file name) duplicates.
	"""

	######## Generate problems as a group, to catch errors early ########
	
	all_problems = list(gen_problems(archetype_file, verbose=verbose))

	########## parse file, get its name, make intermediate files ##########

	problems_dict = dict()

	for problem_text in all_problems:
		problem = parse_problem(problem_text, verbose=verbose)
		file_name = create_file_name(parse_tags(problem['tags'])) # This is of the form "{Topic}-{Type}-{File}"
		assert file_name not in problems_dict, f"Repeat of {file_name}, aborting the processing of {archetype_file}."

		problems_dict[file_name] = problem

	return problems_dict

def process_file(folder, file_dict, destination_folder, overwrite_all = False):
	"""
		Parameters:
			folder				: Simple file name, e.g. 'Series'
			this_dict			: Dictionary of the form
				key : 'name' 				| val : name of file, e.g. 'Question-List-Raw-Series'
				key : 'path' 				| val : path to file, e.g. '/Documents/Problems/Question-List-Raw-Series.tex'
				key : 'problems'			| val : dictionary of the form
					key: problem file name, e.g. 'Series-Compute-0001' | val = dictionary for the problem, see parse_problem
				key : 'final destination' 	| val : final destination folder, e.g. '/Documents/end_zone/Series'
				key : 'conflicts'			| val : list of conflicted files, e.g. ['Series-Compute-0001.tex', 'Series-Compute-0002.tex',...]

			destination_folder 	: The folder which the final folder will end up in,
								  e.g. '/Documents/end_zone' 

		Returns:

	"""

	if overwrite_all:
		######## Create the input file ########

		input_file = f"{folder}-Input.tex"

		file_path = file_dict['path']

		if verbose:
			print(f"Processing {file_path}")
			print(f"Input file = {input_file}")

		with open(input_file, 'w') as f:
			file_path = os.path.abspath(file_path)

			header = "\n".join([
				r"%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
				r"%%%%%%%%%%%%%%%%%%%%%%%%%%%              Header Contents              %%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
				r"%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"
				r"",
				r"%Debug line. to activate this check, put \Verbosetrue at the start of a file calling this.",
				r"\ifVerbose{Input File Called: " + f"{file_path}" + r"}\fi",
				r"",
				r"%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
				r"%%%%%%%%%%%%%%%%%%%%%%%%%%%%                File Contents               %%%%%%%%%%%%%%%%%%%%%%%%%%%",
				r"%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
				r""
			])
			f.write(header)

		######## Process problems ########

		for problem_key, problem_dict in sorted(file_dict['problems'].items()):
			file_tex, help_tex = process_problem(problem_key, problem_dict, input_file, destination_folder,
				copies_initially = copies_initially, quiet = quiet, verbose = verbose)

			file_dict['problems'][problem_key]['help tex'] = help_tex

			######## Write to input file ########

			destination_tex  = os.sep.join([file_dict['final destination'],file_tex])
			destination_help = os.sep.join([file_dict['final destination'],help_tex])

			with open(input_file, 'a') as f:
				lines = []
				lines.append("")
				lines.append(problem_dict['tags'][1:] + "{") # Omit the opening `%`
				lines.append("\t" + r"\select@Question{" + os.sep.join([file_dict['final destination'],file_tex]) + "}" )
				lines.append("}")
				lines.append("")
				
				f.write("\n".join(lines))

			######## Overwrite destination ########

			os.rename(file_tex,  destination_tex)

			######## Ensure destination help file exists, but don't overwrite it ########

			if help_tex:
				with open(destination_help, 'a') as f:
					pass

		destination_input = os.sep.join([destination_folder,input_file])
		
		if os.path.isfile(destination_input):
			os.rename(input_file, destination_input)
		else:
			shutil.move(input_file, destination_folder)

	else:
		# Here, we should put the code for if not all files should be overwritten.
		pass


	######## Resolve conflicts ########
	#
	# if conflict_list:
	# 	conflict_list = sorted(conflict_list)
	# 	do_all = overwrite_all
	# 	print(f"There were {len(conflict_list)} conflicts!")
	# 	while conflict_list:
	# 		conflict_src, conflict_dst = conflict_list.pop(0)
	# 		if do_all:
	# 			os.rename(conflict_src,  conflict_dst)
	# 		else:
	# 			choice = input(f"Would you like to overwrite {conflict_dst} with {conflict_src}?\n" \
	# 				+ f"Enter 'yes' or 'no' to decide for this one, and 'always' or 'never' to decide for the remaining {len(conflict_list)+1} conflicts:\n")
	# 			choice = choice.lower()
	# 			if choice == 'always':
	# 				do_all = True
	# 				print(f"Okay, overwriting each of the remaining {len(conflict_list)+1} conflicts.")
	# 				os.rename(conflict_src,  conflict_dst)
	# 			elif choice == 'yes':
	# 				print(f"Okay, overwriting {conflict_dst} with {conflict_src}.")
	# 				os.rename(conflict_src,  conflict_dst)
	# 			elif choice == 'no':
	# 				print(f"Okay, NOT overwriting {conflict_dst} with {conflict_src}.")
	# 			elif choice == 'never':
	# 				print(f"Okay, not overwriting anything.")
	# 				break

	# try:
	# 	os.rmdir(folder)
	# except OSError:
	# 	print("Hmm, there's still some stuff in {folder}, not deleting it.")


def main(destination_folder = None, quiet = False, copies_initially = 1000, verbose = False):

	######## Determine the files to operate on ########

	try:
		user_input = sys.argv[1]

		files_dict = dict()

		begin = 'Question-List-Raw-'
		end   = '.tex'

		def is_archetype_file(file):
			return file.startswith(begin) and file.endswith(end)

		if os.path.isdir(user_input):
			# Input is a directory.
			archetype_files = [file for file in os.listdir(user_input) if is_archetype_file(file)]

			for file in archetype_files:
				file_key = file[len(begin):-len(end)] # e.g. 'Series'
				files_dict[file_key] = {
					'path' : os.path.join(user_input,file), 
					'name' : file[:-len(end)]}

		else:
			# Input is something else.
			file = user_input
			assert is_archetype_file(file), \
				"That's not an archetype file or a directory! (File name is wrong, at least.)"
			
			file_key = file[len(begin):-len(end)] # e.g. 'Series'
			files_dict[file_key] = {
				'path' : file, 
				'name' : file[:-len(end)]}

	except:
		# input_file = input("Enter name of file to process: ")
		raise Exception("Need something to operate on!")

	print("Processing each of the following files:")
	print("\n".join([files_dict[file_key]['name'] for file_key in files_dict]))

	######## Ready the destination ########

	if destination_folder is None:
		cwd = os.getcwd()
		destination_folder = cwd

	######## Preprocess each file ########

	for file_key in list(files_dict.keys()):

		# e.g. file_key = 'Series'
		#	   file_dict = dictionary containing:
		#			key = 'name'	; val = 'Question-List-Raw-Series'
		#			key = 'path'	; val = '/User/spam/ham/eggs/Question-List-Raw-Series.tex'

		######## Do some preprocessing early ########
		try:
			files_dict[file_key]['problems'] = preprocess_file(files_dict[file_key]['name'])
		except KeyboardInterrupt:
			raise KeyboardInterrupt
		except Exception as exc:
			print(f"Encountered an error in preprocessing {files_dict[file_key]['name']}, moving on:\n{exc}")
			del files_dict[file_key]
			continue

		######## Make the folder in the current working directory ########
		######## 			This is never used, actually.		  ########
		# try:
		# 	os.mkdir(file_key)
		# except OSError as exc:
		# 	if exc.errno != errno.EEXIST:
		# 		raise exc
		# 	pass


		final_destination = os.sep.join([destination_folder, file_key])

		files_dict[file_key]['final destination'] = final_destination

		######## Make the folder in the destination folder ########
		try: 
			os.mkdir(final_destination)
		except OSError as exc:
			if exc.errno != errno.EEXIST:
				raise exc
			pass

		######## Note conflicts, problems which are already generated ########
		files_dict[file_key]['conflicts'] = []

		for problem in files_dict[file_key]['problems']:
			problem_tex = problem + ".tex"
			if os.path.isfile(os.sep.join([final_destination, problem_tex])):
				files_dict[file_key]['conflicts'].append(problem_tex)

	if verbose:
		for file, dictionary in files_dict.items():
			print(f"{file}")
			for key, val in dictionary.items():
				key = " ".join(word.capitalize() for word in key.split())
				print(f"\t{key:18} = ", end = "")
				print(str(val)[:47], end = "")
				if len(str(val)) > 47:
					print(" ...")
				else:
					print()

	######## Handle conflicts ########

	conflicted_files = [file_key for file_key in files_dict if files_dict[file_key]['conflicts']]

	if conflicted_files:
		print(f"There were conflicts in {len(conflicted_files)} of the archetype files!")
		for file in conflicted_files:
			print(f"{file}: {len(files_dict[file]['conflicts'])} conflicts")

		overwrite_all_list = []

		while True:
			response = input("How many (entire archtype files) would you like to overwrite? (all, some, none): ")
			response = response.lower()

			if response == 'all':
				overwrite_all_list = conflicted_files
				break
			elif response == 'some':
				for file in conflicted_files:
					while True:
						file_response = input(f"Would you like to overwrite {file}? (yes/no): ")
						file_response = file_response.lower()
						if file_response in ['y','yes']:
							overwrite_all_list.append(file)
							break
						elif file_response in ['n','no']:
							break
						else:
							print("Hmm, I don't understand. Enter 'yes' or 'no'.")
				break
			elif response == 'none':
				break
			else:
				print("Hmm, I don't understand. Let's try again.")

		for file_key in conflicted_files:
			if file_key not in overwrite_all_list:
				del files_dict[file_key]
			else:
				for problem_tex in files_dict[file_key]['conflicts']:
					os.remove(os.sep.join([files_dict[file_key]['final destination'],problem_tex]))

	######## Proceed, processing the remaining ones ########
	
	for file_key in files_dict:
		try:
			process_file(file_key, files_dict[file_key], destination_folder, overwrite_all = True)
		except AssertionError as exc:
			print(f"Encountered an error in processing {file_key}: {exc}")

if __name__ == "__main__":

	destination_folder = os.path.expanduser(r"~/ProblemOutputs")
	quiet = False
	copies_initially = 10
	verbose = False # Only use for debugging the problem parses and whatnot for now.

	main(destination_folder, quiet, copies_initially, verbose=verbose)


# vim: set tabstop=4 expandtab! :
